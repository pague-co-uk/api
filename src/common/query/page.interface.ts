export interface Page<T> {
  readonly items: readonly T[];

  readonly page: number;

  readonly pageSize: number;

  readonly totalItems: number;
}
