import { BadRequestException } from '@nestjs/common';
import type {
  Engine,
  Field,
  ReportDefinition,
  SchemaTable,
} from './report-builder.types.js';

const fail = (message: string): never => {
  throw new BadRequestException(message);
};
export function compileReport(
  definition: ReportDefinition,
  tables: SchemaTable[],
  engine: Engine,
  schema: string,
  parameters: Record<string, string> = {},
  limit = 101,
) {
  if (
    !definition ||
    !Array.isArray(definition.columns) ||
    !definition.columns.length ||
    definition.columns.length > 100 ||
    !Array.isArray(definition.joins) ||
    definition.joins.length > 5 ||
    !Array.isArray(definition.filters) ||
    definition.filters.length > 30 ||
    !Array.isArray(definition.sort) ||
    definition.sort.length > 10 ||
    typeof definition.sheetName !== 'string' ||
    definition.sheetName.length > 31
  )
    fail('Invalid report configuration.');
  const quote = (name: string) =>
    engine === 'mysql'
      ? '`' + name.replace(/`/g, '``') + '`'
      : '"' + name.replace(/"/g, '""') + '"';
  const table = (name: string) => {
    if (!tables.some((t) => t.name === name))
      fail('A selected table is no longer available.');
    return engine === 'sqlite'
      ? quote(name)
      : `${quote(schema)}.${quote(name)}`;
  };
  const included = new Set([definition.table]);
  table(definition.table);
  const field = (f: Field) => {
    if (
      !f ||
      !included.has(f.table) ||
      !tables
        .find((t) => t.name === f.table)
        ?.columns.some((c) => c.name === f.column)
    )
      fail('A selected field is no longer available.');
    return `${quote(f.table)}.${quote(f.column)}`;
  };
  const joins = definition.joins.map((j) => {
    if (
      !j ||
      included.has(j.table) ||
      !['left', 'inner'].includes(j.type) ||
      !j.left ||
      !j.right ||
      !included.has(j.left.table) ||
      j.right.table !== j.table
    )
      fail('Each join must connect a new table to an existing table.');
    const target = table(j.table);
    included.add(j.table);
    return `${j.type === 'left' ? 'LEFT' : 'INNER'} JOIN ${target} AS ${quote(j.table)} ON ${field(j.left)} = ${field(j.right)}`;
  });
  const values: (string | number)[] = [];
  const bind = (value: string | number) => {
    values.push(value);
    return engine === 'postgres' ? `$${values.length}` : '?';
  };
  const expressions = definition.columns.map((c) => {
    if (
      !c ||
      typeof c.label !== 'string' ||
      !c.label.trim() ||
      c.label.length > 100 ||
      !['', 'number', 'currency', 'date'].includes(c.format) ||
      !['', 'day', 'month', 'year'].includes(c.bucket)
    )
      fail('Invalid column options.');
    let sql = field(c);
    if (c.bucket) {
      const dataType = tables
        .find((t) => t.name === c.table)!
        .columns.find((f) => f.name === c.column)!.type;
      if (engine !== 'sqlite' && !/date|time/i.test(dataType))
        fail('Date grouping requires a date or timestamp column.');
      if (engine === 'postgres') sql = `date_trunc('${c.bucket}', ${sql})`;
      else if (engine === 'mysql')
        sql = `DATE_FORMAT(${sql}, '${c.bucket === 'year' ? '%Y-01-01' : c.bucket === 'month' ? '%Y-%m-01' : '%Y-%m-%d'}')`;
      else
        sql = `strftime('${c.bucket === 'year' ? '%Y-01-01' : c.bucket === 'month' ? '%Y-%m-01' : '%Y-%m-%d'}', ${sql})`;
    }
    if (
      !['', 'sum', 'count', 'distinct', 'avg', 'min', 'max'].includes(
        c.aggregate,
      )
    )
      fail('Invalid aggregation.');
    if (
      ['sum', 'avg'].includes(c.aggregate) &&
      !tables
        .find((t) => t.name === c.table)!
        .columns.find((f) => f.name === c.column)!.numeric
    )
      fail('Sum and average require numeric columns.');
    if (c.aggregate === 'distinct') return `COUNT(DISTINCT ${sql})`;
    return c.aggregate ? `${c.aggregate.toUpperCase()}(${sql})` : sql;
  });
  const predicates = definition.filters.map((f) => {
    if (!f || typeof f !== 'object') fail('Invalid filter.');
    const sql = field(f);
    if (f.operator === 'empty') return `${sql} IS NULL`;
    if (f.operator === 'not_empty') return `${sql} IS NOT NULL`;
    if (typeof f.value !== 'string' || typeof f.parameter !== 'string')
      fail('Invalid filter.');
    const value = f.parameter ? parameters[f.parameter] : f.value;
    if (typeof value !== 'string' || value.length > 10000)
      fail(`Supply a value for ${f.parameter || f.column}.`);
    if (f.operator === 'in') {
      const parts = value.split(',').map((s) => s.trim());
      if (parts.length > 100) fail('A list filter accepts at most 100 values.');
      return `${sql} IN (${parts.map(bind).join(', ')})`;
    }
    if (f.operator === 'contains') {
      // Use ! as a portable LIKE escape character.
      const escaped = value.replace(/[!%_]/g, (c) => '!' + c);
      return `${sql} LIKE ${bind('%' + escaped + '%')} ESCAPE '!'`;
    }
    const operators = {
      eq: '=',
      ne: '<>',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
    };
    if (!Object.hasOwn(operators, f.operator)) fail('Invalid filter operator.');
    const operator = operators[f.operator];
    if (!operator) fail('Invalid filter operator.');
    return `${sql} ${operator} ${bind(value)}`;
  });
  const grouped = definition.columns.some((c) => c.aggregate);
  const groups = grouped
    ? expressions.filter((_, i) => !definition.columns[i].aggregate)
    : [];
  const order = definition.sort.map((s) => {
    if (
      !s ||
      !Number.isInteger(s.index) ||
      s.index < 0 ||
      s.index >= expressions.length ||
      !['asc', 'desc'].includes(s.direction)
    )
      fail('Invalid sort order.');
    return `${s.index + 1} ${s.direction.toUpperCase()}`;
  });
  const sql = `SELECT ${expressions.map((e, i) => `${e} AS ${quote('c' + i)}`).join(', ')} FROM ${table(definition.table)} AS ${quote(definition.table)} ${joins.join(' ')}${predicates.length ? ' WHERE ' + predicates.join(' AND ') : ''}${groups.length ? ' GROUP BY ' + groups.join(', ') : ''}${order.length ? ' ORDER BY ' + order.join(', ') : ''} LIMIT ${bind(Math.max(1, Math.min(100001, limit)))}`;
  return { sql, values };
}
