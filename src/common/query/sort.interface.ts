export type SortDirection = "asc" | "desc";

export interface Sort<TSort extends string = string> {
  readonly field: TSort;

  readonly direction: SortDirection;
}
