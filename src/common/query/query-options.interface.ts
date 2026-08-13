import type { Filter } from "./filter.interface.js";
import type { PageRequest } from "./page-request.interface.js";
import type { Search } from "./search.interface.js";
import type { Sort } from "./sort.interface.js";

export interface QueryOptions<
  TSort extends string = string,
  TFilters extends object = Record<string, unknown>,
> extends PageRequest, Search, Filter<TFilters> {
  readonly sort?: Sort<TSort>;
}
