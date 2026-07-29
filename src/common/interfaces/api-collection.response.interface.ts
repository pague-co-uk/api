import { ApiMeta } from "./api-meta.interface.js";
import { Pagination } from "./api-pagination.interface.js";

export interface ApiCollectionResponse<T> {
  success: true;

  data: T[];

  pagination: Pagination;

  meta: ApiMeta;
}