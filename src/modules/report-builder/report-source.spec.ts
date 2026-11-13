import { jest } from '@jest/globals';
import mysql from 'mysql2';
import type { Connection as MysqlConnection, QueryOptions } from 'mysql2';
import { openSource } from './report-source.js';
import { mysqlConnectionError } from './report-source-error.js';
import type { ConnectionSettings } from './report-builder.types.js';

const settings: ConnectionSettings = {
  engine: 'mysql',
  host: '10.2.11.50',
  port: 3306,
  database: 'bulksms',
  schema: 'bulksms',
  username: 'pague_reports',
  tls: true,
};
const failure = (code: string) =>
  Object.assign(
    new Error('secret-password and sensitive SQL must not be returned'),
    { code },
  );

describe('MySQL reporting connection setup', () => {
  let connectError: Error | null;
  let version: string;
  let errors: Record<string, Error>;
  let noResponse: boolean;
  const destroy = jest.fn();
  const query =
    jest.fn<
      (
        options: QueryOptions,
        values: unknown[],
        callback: (error: Error | null, rows?: unknown[]) => void,
      ) => void
    >();
  beforeEach(() => {
    connectError = null;
    version = '8.0.40';
    errors = {};
    noResponse = false;
    destroy.mockReset();
    query.mockReset();
    query.mockImplementation((options, _values, callback) => {
      if (noResponse) return;
      const error = errors[options.sql];
      callback(
        error || null,
        options.sql.includes('VERSION()') ? [{ version }] : [],
      );
    });
    const client = {
      on: jest.fn(),
      connect: (callback: (error: Error | null) => void) =>
        callback(connectError),
      query,
      destroy,
    };
    jest
      .spyOn(mysql, 'createConnection')
      .mockReturnValue(client as unknown as MysqlConnection);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('identifies authentication failures without exposing raw driver messages', async () => {
    connectError = failure('ER_ACCESS_DENIED_ERROR');
    await expect(openSource(settings, 'secret-password')).rejects.toThrow(
      'connection/authentication failed (ER_ACCESS_DENIED_ERROR)',
    );
    expect(query).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
    expect(
      mysqlConnectionError(connectError, 'connection').message,
    ).not.toContain('secret-password');
  });
  it('explains unsupported TLS without disabling certificate verification', async () => {
    connectError = failure('HANDSHAKE_NO_SSL_SUPPORT');
    await expect(openSource(settings, 'password')).rejects.toThrow(
      'database server does not support it',
    );
    expect(mysql.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({ ssl: { rejectUnauthorized: true } }),
    );
  });
  it('configures the MariaDB timeout and requires a read-only transaction', async () => {
    version = '10.11.9-MariaDB';
    const source = await openSource(settings, 'password');
    expect(query.mock.calls.map((call) => call[0].sql)).toEqual([
      'SELECT VERSION() AS version',
      'SET SESSION max_statement_time = 30',
      'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ',
      'START TRANSACTION READ ONLY',
    ]);
    await source.close();
  });
  it('allows unsupported optional timeout variables while retaining read-only mode', async () => {
    errors['SET SESSION max_execution_time = 30000'] = failure(
      'ER_UNKNOWN_SYSTEM_VARIABLE',
    );
    const source = await openSource(settings, 'password');
    expect(query.mock.calls.map((call) => call[0].sql)).toContain(
      'START TRANSACTION READ ONLY',
    );
    await source.close();
  });
  it('does not ignore timeout permission errors or fall back to a writable transaction', async () => {
    errors['SET SESSION max_execution_time = 30000'] = failure(
      'ER_SPECIFIC_ACCESS_DENIED_ERROR',
    );
    await expect(openSource(settings, 'password')).rejects.toThrow(
      'statement timeout configuration failed (ER_SPECIFIC_ACCESS_DENIED_ERROR)',
    );
    expect(destroy).toHaveBeenCalled();
    errors = { 'START TRANSACTION READ ONLY': failure('ER_PARSE_ERROR') };
    await expect(openSource(settings, 'password')).rejects.toThrow(
      'read-only transaction setup failed (ER_PARSE_ERROR)',
    );
    expect(query.mock.calls.map((call) => call[0].sql)).not.toContain(
      'START TRANSACTION',
    );
  });
  it('destroys the connection if the server does not return a query result within the deadline', async () => {
    jest.useFakeTimers();
    const source = await openSource(settings, 'password');
    noResponse = true;
    const pending = expect(source.query('SELECT 1')).rejects.toMatchObject({
      code: 'PROTOCOL_SEQUENCE_TIMEOUT',
    });
    await jest.advanceTimersByTimeAsync(30000);
    await pending;
    expect(destroy).toHaveBeenCalled();
  });
  it('does not return unrecognized or malicious driver details', () => {
    const error = mysqlConnectionError(
      failure('secret-password'),
      'connection',
    );
    expect(error.message).toContain('(UNKNOWN)');
    expect(error.message).not.toContain('secret-password');
  });
});
