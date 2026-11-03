import { DatabaseSync } from 'node:sqlite';
import { compileReport } from './report-query.js';
import { excelValue } from './report-cell.js';
import type { ReportDefinition, SchemaTable } from './report-builder.types.js';

const schema: SchemaTable[] = [
  {
    name: 'orders',
    columns: [
      { name: 'id', type: 'integer', numeric: true },
      { name: 'amount', type: 'decimal', numeric: true },
      { name: 'region', type: 'text', numeric: false },
      { name: 'created', type: 'timestamp', numeric: false },
    ],
  },
  {
    name: 'regions',
    columns: [
      { name: 'name', type: 'text', numeric: false },
      { name: 'label', type: 'text', numeric: false },
    ],
  },
];
const base = (): ReportDefinition => ({
  connectionId: 'db',
  table: 'orders',
  joins: [],
  filters: [],
  sort: [],
  sheetName: 'Report',
  columns: [
    {
      table: 'orders',
      column: 'region',
      label: 'Region',
      aggregate: '',
      bucket: '',
      format: '',
    },
    {
      table: 'orders',
      column: 'amount',
      label: 'Revenue',
      aggregate: 'sum',
      bucket: '',
      format: 'currency',
    },
  ],
});

describe('report query compiler', () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(
      "CREATE TABLE orders (id INTEGER, amount DECIMAL, region TEXT, created TIMESTAMP); INSERT INTO orders VALUES (1, 10, 'North', '2026-01-02'), (2, 20, 'North', '2026-01-03'), (3, 50, 'South', '2026-02-01'); CREATE TABLE regions(name TEXT, label TEXT); INSERT INTO regions VALUES ('North', 'Northern'), ('South', 'Southern');",
    );
  });
  afterEach(() => db.close());
  const execute = (definition: ReportDefinition, parameters = {}) => {
    const query = compileReport(definition, schema, 'sqlite', '', parameters);
    return db.prepare(query.sql).all(...query.values);
  };
  it('groups and sums in the source database and sorts aggregate results', () => {
    const report = base();
    report.sort = [{ index: 1, direction: 'desc' }];
    expect(execute(report)).toEqual([
      { c0: 'South', c1: 50 },
      { c0: 'North', c1: 30 },
    ]);
  });
  it('binds runtime parameter values and does not execute SQL in a filter', () => {
    const report = base();
    report.filters = [
      {
        table: 'orders',
        column: 'region',
        operator: 'eq',
        value: '',
        parameter: 'region',
      },
    ];
    expect(execute(report, { region: "North' OR 1=1 --" })).toEqual([]);
    expect(execute(report, { region: 'North' })).toEqual([
      { c0: 'North', c1: 30 },
    ]);
    expect(() => execute(report)).toThrow('Supply a value');
  });
  it('supports explicit joins and date grouping', () => {
    const report = base();
    report.joins = [
      {
        table: 'regions',
        type: 'inner',
        left: { table: 'orders', column: 'region' },
        right: { table: 'regions', column: 'name' },
      },
    ];
    report.columns[0] = {
      ...report.columns[0],
      table: 'regions',
      column: 'label',
    };
    expect(execute(report)).toEqual([
      { c0: 'Northern', c1: 30 },
      { c0: 'Southern', c1: 50 },
    ]);
    report.columns[0] = {
      ...report.columns[0],
      table: 'orders',
      column: 'created',
      bucket: 'month',
    };
    expect(execute(report)).toEqual([
      { c0: '2026-01-01', c1: 30 },
      { c0: '2026-02-01', c1: 50 },
    ]);
  });
  it('treats wildcard characters in contains as literal text', () => {
    const report = base();
    report.filters = [
      {
        table: 'orders',
        column: 'region',
        operator: 'contains',
        value: '%',
        parameter: '',
      },
    ];
    expect(execute(report)).toEqual([]);
  });
  it('rejects unavailable fields, injected aggregation and invalid grouping', () => {
    const report = base();
    report.columns[0].column = 'region); DROP TABLE orders; --';
    expect(() => execute(report)).toThrow('field');
    report.columns[0].column = 'region';
    report.columns[0].aggregate = 'SUM) FROM secrets --' as never;
    expect(() => execute(report)).toThrow('aggregation');
    report.columns[0].aggregate = 'avg';
    expect(() => execute(report)).toThrow('numeric');
  });
  it('compiles engine-specific placeholders and quotes identifiers', () => {
    const report = base();
    report.filters = [
      {
        table: 'orders',
        column: 'region',
        operator: 'eq',
        value: 'North',
        parameter: '',
      },
    ];
    const pg = compileReport(report, schema, 'postgres', 'public');
    expect(pg.sql).toContain('"public"."orders"');
    expect(pg.sql).toContain('= $1');
    expect(pg.sql).toContain('LIMIT $2');
    expect(pg.values).toEqual(['North', 101]);
    const mysql = compileReport(report, schema, 'mysql', 'sales');
    expect(mysql.sql).toContain('`sales`.`orders`');
    expect(mysql.sql).toContain('= ?');
  });
});

describe('Excel cell conversion', () => {
  it('keeps exact long identifiers and numeric precision', () => {
    expect(excelValue(9007199254740993n, true, false)).toBe('9007199254740993');
    expect(excelValue('123456789012345.67', true, false)).toBe(
      '123456789012345.67',
    );
    expect(excelValue('123.45', true, false)).toBe(123.45);
    expect(excelValue(42n, true, false)).toBe(42);
    expect(excelValue('00123', false, false)).toBe('00123');
  });
  it('writes formula-like text and objects as literal strings', () => {
    expect(excelValue('=HYPERLINK("https://example.com")', false, false)).toBe(
      '=HYPERLINK("https://example.com")',
    );
    expect(typeof excelValue({ formula: '1+1' }, false, false)).toBe('string');
  });
  it('turns date-formatted ISO strings into actual Excel dates', () => {
    expect(excelValue('2026-01-03', false, true)).toEqual(
      new Date('2026-01-03T00:00:00Z'),
    );
  });
});
