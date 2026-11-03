import { jest } from '@jest/globals';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/authorization/interfaces/authenticated-user.interface.js';
import type { ReportDefinition } from './report-builder.types.js';
import { ReportBuilderService } from './report-builder.service.js';

const user: AuthenticatedUser = {
  userId: 'user-a',
  sessionId: 'session',
  clientId: 'client-a',
  active: true,
  locked: false,
  mfaEnabled: false,
  username: 'reporter',
  email: '',
  firstName: '',
  lastName: '',
  roles: [],
};
const admin: AuthenticatedUser = {
  ...user,
  roles: [
    {
      id: 'admin',
      name: 'PLATFORM_SUPER_ADMIN',
      permissions: [],
      description: null,
      priority: 0,
    },
  ],
};

describe('report builder isolation and real SQLite exports', () => {
  let root: string;
  let service: ReportBuilderService;
  let connection: Record<string, unknown> | undefined;
  const query = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
  const execute = jest.fn<(...args: unknown[]) => Promise<number>>();
  const oldRoot = process.env.REPORT_SQLITE_ROOT;
  const oldKey = process.env.REPORT_CONNECTION_KEY;
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'pague-report-test-'));
    process.env.REPORT_SQLITE_ROOT = root;
    process.env.REPORT_CONNECTION_KEY = 'ab'.repeat(32);
    const db = new DatabaseSync(path.join(root, 'sales.db'));
    db.exec(
      "CREATE TABLE sales (id INTEGER, region TEXT, amount DECIMAL, note TEXT); INSERT INTO sales VALUES (1, 'North', 10.25, '=1+1'), (2, 'North', 20.50, 'plain'), (3, 'South', 50, 'text');",
    );
    db.close();
    connection = undefined;
    query.mockReset();
    execute.mockReset();
    query.mockImplementation(() =>
      Promise.resolve(connection ? [connection] : []),
    );
    execute.mockImplementation((...args: unknown[]) => {
      const [template, ...values] = args as [
        TemplateStringsArray,
        ...unknown[],
      ];
      if (template.join('?').includes('INSERT INTO report_connections')) {
        connection = {
          id: values[0],
          name: values[1],
          clientId: values[2],
          settings: JSON.parse(values[3] as string),
          secret: values[4],
        };
      }
      return Promise.resolve(1);
    });
    const dbMock = {
      $queryRaw: query,
      $executeRaw: execute,
      client: { findUnique: () => Promise.resolve({ id: 'client-a' }) },
    };
    service = new ReportBuilderService(dbMock as unknown as PrismaClient);
    await service.saveConnection(admin, {
      name: 'Sales',
      clientId: 'client-a',
      password: 'secret-password',
      settings: { engine: 'sqlite', database: 'sales.db' },
    });
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (oldRoot === undefined) delete process.env.REPORT_SQLITE_ROOT;
    else process.env.REPORT_SQLITE_ROOT = oldRoot;
    if (oldKey === undefined) delete process.env.REPORT_CONNECTION_KEY;
    else process.env.REPORT_CONNECTION_KEY = oldKey;
  });
  const definition = (): ReportDefinition => ({
    connectionId: String(connection!.id),
    table: 'sales',
    joins: [],
    filters: [],
    sort: [],
    sheetName: 'Sales',
    columns: [
      {
        table: 'sales',
        column: 'region',
        label: 'Region',
        aggregate: '',
        bucket: '',
        format: '',
      },
      {
        table: 'sales',
        column: 'amount',
        label: 'Revenue',
        aggregate: 'sum',
        bucket: '',
        format: 'currency',
      },
    ],
  });
  it('encrypts credentials and excludes credentials and connection settings from client responses', async () => {
    expect(connection!.secret).not.toContain('secret-password');
    const records = await service.connections(user);
    expect(records[0]).not.toHaveProperty('secret');
    expect(records[0]).not.toHaveProperty('settings');
  });
  it('denies connection access across clients and rejects API-key-only callers', async () => {
    await expect(
      service.connection(
        { ...user, clientId: 'client-b' },
        String(connection!.id),
      ),
    ).rejects.toThrow('not found');
    await expect(
      service.connection(undefined as never, String(connection!.id)),
    ).rejects.toThrow('session');
    await expect(service.saveConnection(user, {})).rejects.toThrow(
      'administrators',
    );
  });
  it('prevents a client from reading or deleting another client’s saved report', async () => {
    query.mockResolvedValueOnce([
      { id: 'report-b', clientId: 'client-b', definition: definition() },
    ]);
    await expect(service.removeReport(user, 'report-b')).rejects.toThrow(
      'not found',
    );
  });
  it('discovers real tables and previews source aggregations', async () => {
    const schema = await service.schema(user, String(connection!.id));
    expect(schema[0].name).toBe('sales');
    const preview = await service.preview(user, { definition: definition() });
    expect(preview.rows.map((row) => [row[0], Number(row[1])])).toEqual([
      ['North', 30.75],
      ['South', 50],
    ]);
  });
  it('builds a readable XLSX with numeric totals, frozen headers, and audit status', async () => {
    const response = new PassThrough() as PassThrough & {
      set: () => unknown;
      headersSent: boolean;
    };
    response.set = () => response;
    response.headersSent = false;
    const chunks: Buffer[] = [];
    response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    await service.export(
      user,
      { definition: definition() },
      response as unknown as Response,
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.concat(chunks));
    const sheet = workbook.getWorksheet('Sales')!;
    expect(sheet.getCell('A1').value).toBe('Region');
    expect(sheet.getCell('B2').value).toBe(30.75);
    expect(sheet.rowCount).toBe(3);
    expect(sheet.views[0].state).toBe('frozen');
    expect(workbook.getWorksheet('Export details')).toBeDefined();
    expect(execute.mock.calls).toEqual(
      expect.arrayContaining([expect.arrayContaining(['complete'])]),
    );
  });
  it('blocks SQLite paths outside the configured root', async () => {
    (connection!.settings as { database: string }).database = '../outside.db';
    await expect(service.schema(user, String(connection!.id))).rejects.toThrow(
      'REPORT_SQLITE_ROOT',
    );
  });
  it('rejects missing encryption configuration before saving a connection', async () => {
    delete process.env.REPORT_CONNECTION_KEY;
    await expect(
      service.saveConnection(admin, {
        name: 'Other',
        settings: { engine: 'sqlite', database: 'sales.db' },
      }),
    ).rejects.toThrow('REPORT_CONNECTION_KEY');
  });
});
