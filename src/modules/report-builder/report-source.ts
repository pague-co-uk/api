import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import mysql from 'mysql2';
import { Client } from 'pg';
import {
  mysqlConnectionError,
  sourceErrorCode,
} from './report-source-error.js';
import type {
  ConnectionSettings,
  SchemaTable,
} from './report-builder.types.js';

type Row = Record<string, unknown>;
export interface ReportSource {
  query(sql: string, values?: (string | number)[]): Promise<Row[]>;
  rows(sql: string, values: (string | number)[]): AsyncIterable<Row>;
  close(): Promise<void>;
}

export async function openSource(
  settings: ConnectionSettings,
  password: string,
): Promise<ReportSource> {
  if (settings.engine === 'postgres') {
    const client = new Client({
      host: settings.host,
      port: settings.port,
      database: settings.database,
      user: settings.username,
      password,
      ssl: settings.tls ? { rejectUnauthorized: true } : undefined,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
      query_timeout: 35000,
      application_name: 'pague-report-builder',
    });
    client.on('error', () => {});
    try {
      await client.connect();
      await client.query(
        'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
      );
    } catch {
      await client.end().catch(() => {});
      throw new BadRequestException(
        'Cannot connect to PostgreSQL. Check connection settings and access.',
      );
    }
    return {
      query: async (sql, values = []) =>
        (await client.query<Row>(sql, values)).rows,
      async *rows(sql, values) {
        await client.query(
          `DECLARE pague_report NO SCROLL CURSOR FOR ${sql}`,
          values,
        );
        while (true) {
          const batch = (await client.query<Row>('FETCH 500 FROM pague_report'))
            .rows;
          if (!batch.length) break;
          for (const row of batch) yield row;
        }
      },
      close: async () => {
        try {
          await client.query('ROLLBACK');
        } finally {
          await client.end();
        }
      },
    };
  }
  if (settings.engine === 'mysql') {
    const client = mysql.createConnection({
      host: settings.host,
      port: settings.port,
      database: settings.database,
      user: settings.username,
      password,
      ssl: settings.tls ? { rejectUnauthorized: true } : undefined,
      connectTimeout: 5000,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
      multipleStatements: false,
    });
    // A listener prevents an idle connection error from becoming an uncaught exception.
    client.on('error', () => {});
    const query = (sql: string, values: (string | number)[] = []) =>
      new Promise<Row[]>((resolve, reject) => {
        const timer = setTimeout(() => {
          client.destroy();
          reject(
            Object.assign(new Error('Report query timed out.'), {
              code: 'PROTOCOL_SEQUENCE_TIMEOUT',
            }),
          );
        }, 30000);
        client.query({ sql, timeout: 30000 }, values, (error, rows) => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve(rows as Row[]);
        });
      });
    let stage = 'connection/authentication';
    try {
      await new Promise<void>((resolve, reject) => {
        client.connect((error) => (error ? reject(error) : resolve()));
      });
      stage = 'server version check';
      // MariaDB has a different statement timeout variable.
      const version = await query('SELECT VERSION() AS version');
      stage = 'statement timeout configuration';
      try {
        await query(
          /mariadb/i.test(String(version[0].version))
            ? 'SET SESSION max_statement_time = 30'
            : 'SET SESSION max_execution_time = 30000',
        );
      } catch (error) {
        // Older servers may lack this optional variable. Connection-destroying
        // client deadlines remain enforced for both queries and streams.
        if (sourceErrorCode(error) !== 'ER_UNKNOWN_SYSTEM_VARIABLE')
          throw error;
      }
      stage = 'transaction isolation configuration';
      await query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      stage = 'read-only transaction setup';
      await query('START TRANSACTION READ ONLY');
    } catch (error) {
      client.destroy();
      throw mysqlConnectionError(error, stage);
    }
    return {
      query,
      async *rows(sql, values) {
        const stream = client
          .query({ sql, timeout: 30000 }, values)
          .stream({ highWaterMark: 100 });
        const timer = setTimeout(() => {
          stream.destroy(new Error('Report query exceeded 30 seconds.'));
          client.destroy();
        }, 30000);
        try {
          for await (const row of stream) yield row as Row;
        } finally {
          clearTimeout(timer);
          stream.destroy();
        }
      },
      close: () => {
        client.destroy();
        return Promise.resolve();
      },
    };
  }
  // SQLite is read-only and restricted to an operator-configured directory.
  if (!process.env.REPORT_SQLITE_ROOT)
    throw new BadRequestException(
      'SQLite connections require REPORT_SQLITE_ROOT on the API server.',
    );
  let filename: string;
  try {
    const root = await realpath(process.env.REPORT_SQLITE_ROOT);
    filename = await realpath(path.resolve(root, settings.database));
    const relative = path.relative(root, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !relative)
      throw new Error();
  } catch {
    throw new BadRequestException(
      'Choose an existing SQLite database inside REPORT_SQLITE_ROOT.',
    );
  }
  const worker = new Worker(
    `
    const { parentPort, workerData } = require('node:worker_threads');
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(workerData, { readOnly: true, allowExtension: false });
    db.exec('PRAGMA query_only=ON; BEGIN');
    let iterator;
    let exhausted = false;
    parentPort.on('message', ({ sql, values, next }) => {
      try {
        if (next) {
          const rows = [];
          for (let i = 0; i < 500 && !exhausted; i++) { const item = iterator.next(); if (item.done) { exhausted = true; break; } rows.push(item.value); }
          parentPort.postMessage({ rows });
        } else if (sql) {
          const stmt = db.prepare(sql); stmt.setReadBigInts(true);
          if (values.stream) { exhausted = false; iterator = stmt.iterate(...values.args); parentPort.postMessage({ rows: [] }); }
          else parentPort.postMessage({ rows: stmt.all(...values.args) });
        }
      } catch { parentPort.postMessage({ error: true }); }
    });
  `,
    { eval: true, workerData: filename },
  );
  // Retain worker failures so an error between requests also rejects the next call.
  let failure: Error | undefined;
  worker.on('error', (error) => {
    failure = error;
  });
  const send = (message: unknown) =>
    new Promise<Row[]>((resolve, reject) => {
      if (failure)
        return reject(
          new ServiceUnavailableException(
            'SQLite database could not be opened.',
          ),
        );
      const cleanup = () => {
        clearTimeout(timer);
        worker.off('message', receive);
        worker.off('error', error);
        worker.off('exit', exited);
      };
      const error = () => {
        cleanup();
        reject(
          new BadRequestException(
            'SQLite query failed. Check selected fields and database access.',
          ),
        );
      };
      const exited = () => error();
      const receive = (result: { rows: Row[]; error?: boolean }) => {
        cleanup();
        if (result.error) error();
        else resolve(result.rows);
      };
      const timer = setTimeout(() => {
        cleanup();
        void worker.terminate();
        reject(new BadRequestException('SQLite query exceeded 30 seconds.'));
      }, 30000);
      worker.once('message', receive);
      worker.once('error', error);
      worker.once('exit', exited);
      worker.postMessage(message);
    });
  return {
    query: (sql, values = []) => send({ sql, values: { args: values } }),
    async *rows(sql, values) {
      await send({ sql, values: { args: values, stream: true } });
      while (true) {
        const batch = await send({ next: true });
        if (!batch.length) break;
        for (const row of batch) yield row;
      }
    },
    close: async () => {
      await worker.terminate();
    },
  };
}

export async function discoverSchema(
  source: ReportSource,
  settings: ConnectionSettings,
): Promise<SchemaTable[]> {
  let rows: Row[];
  if (settings.engine === 'sqlite') {
    rows = await source.query(
      "SELECT m.name AS table_name, p.name AS column_name, p.type AS data_type FROM sqlite_schema m JOIN pragma_table_info(m.name) p WHERE m.type IN ('table', 'view') AND m.name NOT LIKE 'sqlite_%' ORDER BY m.name, p.cid",
    );
  } else {
    const placeholder = settings.engine === 'postgres' ? '$1' : '?';
    rows = await source.query(
      `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = ${placeholder} ORDER BY table_name, ordinal_position`,
      [settings.schema],
    );
  }
  const tables = new Map<string, SchemaTable>();
  for (const row of rows) {
    const name = String(row.table_name);
    if (!tables.has(name)) tables.set(name, { name, columns: [] });
    tables.get(name)!.columns.push({
      name: String(row.column_name),
      type: String(row.data_type),
      numeric: /int|decimal|numeric|float|double|real|money/i.test(
        String(row.data_type),
      ),
    });
  }
  return [...tables.values()];
}
