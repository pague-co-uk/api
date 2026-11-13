import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { DATABASE } from '../../database/database.constants.js';
import type { AuthenticatedUser } from '../../common/authorization/interfaces/authenticated-user.interface.js';
import type {
  ConnectionRecord,
  ConnectionSettings,
  ReportDefinition,
  SavedReport,
} from './report-builder.types.js';
import { discoverSchema, openSource } from './report-source.js';
import { excelValue } from './report-cell.js';
import { compileReport } from './report-query.js';

export const BUILDER = {
  read: 'report-builder.read',
  edit: 'report-builder.edit',
  export: 'report-builder.export',
  connections: 'report-builder.connections.manage',
} as const;
export function platform(user: AuthenticatedUser) {
  return user.roles.some((role) => role.name === 'PLATFORM_SUPER_ADMIN');
}
function text(value: unknown, name: string, max = 255): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new BadRequestException(`Supply a valid ${name}.`);
  return value.trim();
}
function json<T>(value: T | string): T {
  return typeof value === 'string' ? (JSON.parse(value) as T) : value;
}

@Injectable()
export class ReportBuilderService {
  private exports = 0;
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  private key() {
    const key = Buffer.from(process.env.REPORT_CONNECTION_KEY ?? '', 'hex');
    if (
      key.length !== 32 ||
      !/^[a-f0-9]{64}$/i.test(process.env.REPORT_CONNECTION_KEY ?? '')
    )
      throw new ServiceUnavailableException(
        'Configure REPORT_CONNECTION_KEY as a 64-character hex key before managing database connections.',
      );
    return key;
  }
  private encrypt(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((b) => b.toString('base64'))
      .join('.');
  }
  private decrypt(secret: string) {
    const [iv, tag, encrypted] = secret
      .split('.')
      .map((s) => Buffer.from(s, 'base64'));
    const cipher = createDecipheriv('aes-256-gcm', this.key(), iv);
    cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString(
      'utf8',
    );
  }
  private session(user: AuthenticatedUser) {
    if (!user?.active || user.locked)
      throw new ForbiddenException('An active user session is required.');
  }
  private administrator(user: AuthenticatedUser) {
    this.session(user);
    if (!platform(user))
      throw new ForbiddenException(
        'Only platform administrators can manage database connections.',
      );
  }
  async connections(user: AuthenticatedUser, management = false) {
    this.session(user);
    if (management) this.administrator(user);
    const records = platform(user)
      ? await this.db.$queryRaw<
          ConnectionRecord[]
        >`SELECT rc.id, rc.name, rc.clientId, rc.settings, COALESCE(NULLIF(c.displayName, ''), c.companyName) AS clientName FROM report_connections rc LEFT JOIN clients c ON c.id = rc.clientId ORDER BY rc.name`
      : await this.db.$queryRaw<
          ConnectionRecord[]
        >`SELECT rc.id, rc.name, rc.clientId, rc.settings, COALESCE(NULLIF(c.displayName, ''), c.companyName) AS clientName FROM report_connections rc LEFT JOIN clients c ON c.id = rc.clientId WHERE rc.clientId = ${user.clientId} ORDER BY rc.name`;
    return records.map((r) => ({
      id: r.id,
      name: r.name,
      clientId: r.clientId,
      clientName: r.clientName ?? null,
      ...(management ? { settings: json(r.settings) } : {}),
    }));
  }
  async connection(user: AuthenticatedUser, id: string) {
    this.session(user);
    const rows = await this.db.$queryRaw<
      ConnectionRecord[]
    >`SELECT * FROM report_connections WHERE id = ${id} LIMIT 1`;
    const record = rows[0];
    if (!record || (!platform(user) && record.clientId !== user.clientId))
      throw new NotFoundException('Database connection not found.');
    return { ...record, settings: json(record.settings) };
  }
  async saveConnection(
    user: AuthenticatedUser,
    body: Record<string, unknown>,
    id?: string,
  ) {
    this.administrator(user);
    if (id) await this.connection(user, id);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Invalid connection request.');
    const name = text(body.name, 'connection name', 100);
    const raw = body.settings as ConnectionSettings;
    if (!raw || !['postgres', 'mysql', 'sqlite'].includes(raw.engine))
      throw new BadRequestException('Select a supported database type.');
    const settings: ConnectionSettings = {
      engine: raw.engine,
      host: raw.engine === 'sqlite' ? '' : text(raw.host, 'host'),
      database: text(raw.database, 'database'),
      username: raw.engine === 'sqlite' ? '' : text(raw.username, 'username'),
      schema:
        raw.engine === 'postgres'
          ? text(raw.schema || 'public', 'schema')
          : raw.engine === 'mysql'
            ? text(raw.database, 'database')
            : '',
      port: raw.engine === 'sqlite' ? 0 : Number(raw.port),
      tls: raw.tls === true,
    };
    if (
      raw.engine !== 'sqlite' &&
      (!Number.isInteger(settings.port) ||
        settings.port < 1 ||
        settings.port > 65535)
    )
      throw new BadRequestException('Port must be between 1 and 65535.');
    const clientId = body.clientId
      ? text(body.clientId, 'client ID', 36)
      : null;
    if (
      clientId &&
      !(await this.db.client.findUnique({
        where: { id: clientId },
        select: { id: true },
      }))
    )
      throw new BadRequestException('Client does not exist.');
    const old = id ? await this.connection(user, id) : undefined;
    // Changing assignment invalidates saved reports for the previous client.
    if (old && old.clientId !== clientId) {
      const reports = await this.db.$queryRaw<
        { id: string }[]
      >`SELECT id FROM report_definitions WHERE connectionId = ${id!} LIMIT 1`;
      if (reports.length)
        throw new BadRequestException(
          'Remove reports using this connection before changing its client assignment.',
        );
    }
    if (body.password !== undefined && typeof body.password !== 'string')
      throw new BadRequestException('Invalid database password.');
    const password = body.password;
    if (password && password.length > 4096)
      throw new BadRequestException('Database password is too long.');
    const secret =
      password !== undefined
        ? this.encrypt(password)
        : (old?.secret ?? this.encrypt(''));
    const connectionId = id ?? randomUUID();
    if (id)
      await this.db
        .$executeRaw`UPDATE report_connections SET name=${name}, clientId=${clientId}, settings=${JSON.stringify(settings)}, secret=${secret}, updatedAt=NOW(3) WHERE id=${id}`;
    else
      await this.db
        .$executeRaw`INSERT INTO report_connections (id, name, clientId, settings, secret, createdBy, createdAt, updatedAt) VALUES (${connectionId}, ${name}, ${clientId}, ${JSON.stringify(settings)}, ${secret}, ${user.userId}, NOW(3), NOW(3))`;
    return { id: connectionId, name };
  }
  async removeConnection(user: AuthenticatedUser, id: string) {
    this.administrator(user);
    await this.connection(user, id);
    const reports = await this.db.$queryRaw<
      { id: string }[]
    >`SELECT id FROM report_definitions WHERE connectionId=${id} LIMIT 1`;
    if (reports.length)
      throw new BadRequestException(
        'Remove reports using this connection first.',
      );
    await this.db.$executeRaw`DELETE FROM report_connections WHERE id=${id}`;
    return { deleted: true };
  }
  async schema(user: AuthenticatedUser, id: string) {
    const connection = await this.connection(user, id);
    const source = await openSource(
      connection.settings,
      this.decrypt(connection.secret),
    );
    try {
      return await discoverSchema(source, connection.settings);
    } catch {
      throw new BadRequestException(
        'Unable to read the database schema. Check database access.',
      );
    } finally {
      await source.close();
    }
  }
  async reports(user: AuthenticatedUser) {
    this.session(user);
    const rows = platform(user)
      ? await this.db.$queryRaw<
          SavedReport[]
        >`SELECT id, clientId, name, definition, updatedAt FROM report_definitions ORDER BY updatedAt DESC`
      : await this.db.$queryRaw<
          SavedReport[]
        >`SELECT id, clientId, name, definition, updatedAt FROM report_definitions WHERE clientId=${user.clientId} ORDER BY updatedAt DESC`;
    return rows.map((row) => ({ ...row, definition: json(row.definition) }));
  }
  async report(user: AuthenticatedUser, id: string) {
    this.session(user);
    const rows = await this.db.$queryRaw<
      SavedReport[]
    >`SELECT id, clientId, name, definition, updatedAt FROM report_definitions WHERE id=${id}`;
    if (!rows[0] || (!platform(user) && rows[0].clientId !== user.clientId))
      throw new NotFoundException('Report not found.');
    return { ...rows[0], definition: json(rows[0].definition) };
  }
  async saveReport(
    user: AuthenticatedUser,
    body: { name: string; definition: ReportDefinition },
    id?: string,
  ) {
    this.session(user);
    const old = id ? await this.report(user, id) : undefined;
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Invalid report request.');
    const name = text(body.name, 'report name', 100);
    const definition = body.definition;
    if (!definition || JSON.stringify(definition).length > 100000)
      throw new BadRequestException('Invalid report definition.');
    const connection = await this.connection(
      user,
      text(definition.connectionId, 'connection ID', 36),
    );
    const clientId = connection.clientId ?? user.clientId;
    if (old && old.clientId !== clientId)
      throw new BadRequestException(
        'A report cannot move between clients. Create a new report instead.',
      );
    compileReport(
      definition,
      await this.schema(user, connection.id),
      connection.settings.engine,
      connection.settings.schema,
      Object.fromEntries(
        (Array.isArray(definition.filters) ? definition.filters : [])
          .filter((f) => f && f.parameter)
          .map((f) => [f.parameter, f.value]),
      ),
    );
    const reportId = id ?? randomUUID();
    if (id)
      await this.db
        .$executeRaw`UPDATE report_definitions SET name=${name}, connectionId=${connection.id}, definition=${JSON.stringify(definition)}, updatedAt=NOW(3) WHERE id=${id}`;
    else
      await this.db
        .$executeRaw`INSERT INTO report_definitions (id, clientId, connectionId, name, definition, createdBy, createdAt, updatedAt) VALUES (${reportId}, ${clientId}, ${connection.id}, ${name}, ${JSON.stringify(definition)}, ${user.userId}, NOW(3), NOW(3))`;
    return { id: reportId, name };
  }
  async removeReport(user: AuthenticatedUser, id: string) {
    await this.report(user, id);
    await this.db.$executeRaw`DELETE FROM report_definitions WHERE id=${id}`;
    return { deleted: true };
  }
  private async prepare(
    user: AuthenticatedUser,
    body: { definition: ReportDefinition; parameters?: Record<string, string> },
    limit: number,
  ) {
    if (
      !body?.definition ||
      typeof body.definition.connectionId !== 'string' ||
      JSON.stringify(body).length > 120000 ||
      (body.parameters !== undefined &&
        (typeof body.parameters !== 'object' ||
          body.parameters === null ||
          Array.isArray(body.parameters)))
    )
      throw new BadRequestException('Invalid report request.');
    const connection = await this.connection(
      user,
      body.definition.connectionId,
    );
    const source = await openSource(
      connection.settings,
      this.decrypt(connection.secret),
    );
    try {
      const schema = await discoverSchema(source, connection.settings);
      const query = compileReport(
        body.definition,
        schema,
        connection.settings.engine,
        connection.settings.schema,
        body.parameters,
        limit,
      );
      return { source, query, schema };
    } catch (error) {
      await source.close();
      throw error;
    }
  }
  async preview(
    user: AuthenticatedUser,
    body: { definition: ReportDefinition; parameters?: Record<string, string> },
  ) {
    const { source, query } = await this.prepare(user, body, 101);
    try {
      const rows = await source.query(query.sql, query.values);
      return {
        rows: rows
          .slice(0, 100)
          .map((row) =>
            Object.values(row).map((value) =>
              typeof value === 'bigint' ? value.toString() : value,
            ),
          ),
        hasMore: rows.length > 100,
      };
    } catch {
      throw new BadRequestException(
        'The database could not run this report. Check field types, filters, and query complexity.',
      );
    } finally {
      await source.close();
    }
  }
  async export(
    user: AuthenticatedUser,
    body: { definition: ReportDefinition; parameters?: Record<string, string> },
    response: Response,
  ) {
    if (this.exports >= 2)
      throw new ServiceUnavailableException(
        'Two exports are already running. Try again shortly.',
      );
    this.exports++;
    let source: Awaited<ReturnType<typeof openSource>> | undefined;
    let exportId: string | undefined;
    let output: PassThrough | undefined;
    const started = Date.now();
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
      if (source) void source.close().catch(() => {});
    };
    response.once('close', cancel);
    try {
      const prepared = await this.prepare(user, body, 100001);
      source = prepared.source;
      exportId = randomUUID();
      await this.db
        .$executeRaw`INSERT INTO report_exports (id, clientId, userId, connectionId, status, rowCount, createdAt) VALUES (${exportId}, ${user.clientId}, ${user.userId}, ${body.definition.connectionId}, 'running', 0, NOW(3))`;
      // Stream through a small buffer; database cursors keep source results out of memory.
      output = new PassThrough({ highWaterMark: 65536 });
      output.on('error', () => {});
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: output,
        useStyles: true,
        useSharedStrings: false,
      });
      const sheetName =
        (body.definition.sheetName || 'Report')
          .replace(/[\\/*?:[\]]/g, '')
          .replace(/^'+|'+$/g, '')
          .slice(0, 31) || 'Report';
      const sheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      sheet.columns = body.definition.columns.map((c, i) => ({
        header: c.label,
        key: 'c' + i,
        width: 24,
        style: {
          numFmt:
            c.format === 'currency'
              ? '#,##0.00'
              : c.format === 'number'
                ? '#,##0.########'
                : c.format === 'date'
                  ? 'yyyy-mm-dd'
                  : 'General',
        },
      }));
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F2937' },
      };
      sheet.getRow(1).commit();
      response.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="report.xlsx"',
        'Cache-Control': 'no-store',
        'X-Export-Row-Limit': '100000',
      });
      output.pipe(response);
      let count = 0;
      let truncated = false;
      for await (const row of source.rows(
        prepared.query.sql,
        prepared.query.values,
      )) {
        if (cancelled || Date.now() - started > 120000)
          throw new Error('Export cancelled or timed out');
        if (count === 100000) {
          truncated = true;
          break;
        }
        const values = body.definition.columns.map((c, i) => {
          const column = prepared.schema
            .find((t) => t.name === c.table)
            ?.columns.find((f) => f.name === c.column);
          const numeric =
            ['count', 'distinct'].includes(c.aggregate) ||
            (!c.bucket && column?.numeric === true);
          return excelValue(row['c' + i], numeric, c.format === 'date');
        });
        sheet.addRow(values).commit();
        count++;
      }
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: {
          row: Math.max(1, count + 1),
          column: body.definition.columns.length,
        },
      };
      sheet.commit();
      const info = workbook.addWorksheet(
        sheetName.toLowerCase() === 'export details'
          ? 'Export information'
          : 'Export details',
      );
      info.addRow(['Generated at (UTC)', new Date().toISOString()]).commit();
      info.addRow(['Rows', count]).commit();
      info
        .addRow([
          'Limit reached',
          truncated ? 'Yes. Refine filters to export remaining data.' : 'No',
        ])
        .commit();
      info.commit();
      await workbook.commit();
      await this.db
        .$executeRaw`UPDATE report_exports SET status=${truncated ? 'truncated' : 'complete'}, rowCount=${count}, completedAt=NOW(3) WHERE id=${exportId}`;
    } catch (error) {
      output?.destroy();
      if (exportId)
        await this.db
          .$executeRaw`UPDATE report_exports SET status='failed', completedAt=NOW(3) WHERE id=${exportId}`.catch(
          () => {},
        );
      if (response.headersSent) {
        response.destroy();
        return;
      }
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof ServiceUnavailableException
      )
        throw error;
      throw new BadRequestException(
        'Unable to generate the workbook. Check database access and report configuration.',
      );
    } finally {
      response.off('close', cancel);
      await source?.close().catch(() => {});
      this.exports--;
    }
  }
}
