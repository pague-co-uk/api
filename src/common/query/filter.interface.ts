export interface Filter<TFilters extends object = Record<string, unknown>> {
  readonly filters?: TFilters;
}
