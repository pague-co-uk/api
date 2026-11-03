export type Engine = 'postgres' | 'mysql' | 'sqlite';
export interface ConnectionSettings {
  engine: Engine;
  host: string;
  port: number;
  database: string;
  schema: string;
  username: string;
  tls: boolean;
}
export interface ConnectionRecord {
  id: string;
  name: string;
  clientId: string | null;
  settings: ConnectionSettings;
  secret: string;
}
export interface SchemaTable {
  name: string;
  columns: { name: string; type: string; numeric: boolean }[];
}
export interface Field {
  table: string;
  column: string;
}
export interface ReportColumn extends Field {
  label: string;
  aggregate: '' | 'sum' | 'count' | 'distinct' | 'avg' | 'min' | 'max';
  bucket: '' | 'day' | 'month' | 'year';
  format: '' | 'number' | 'currency' | 'date';
}
export interface ReportFilter extends Field {
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'in'
    | 'empty'
    | 'not_empty';
  value: string;
  parameter: string;
}
export interface ReportDefinition {
  connectionId: string;
  table: string;
  joins: { table: string; type: 'left' | 'inner'; left: Field; right: Field }[];
  columns: ReportColumn[];
  filters: ReportFilter[];
  sort: { index: number; direction: 'asc' | 'desc' }[];
  sheetName: string;
}
export interface SavedReport {
  id: string;
  clientId: string;
  name: string;
  definition: ReportDefinition;
  updatedAt: Date;
}
