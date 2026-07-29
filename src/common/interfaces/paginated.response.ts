import type { ApiCollectionResponse } from "./api-collection.response.interface.js";
import type { Pagination } from "./api-pagination.interface.js";

export class PaginatedResponse<T> {
  constructor(
    public readonly data: T[],
    public readonly pagination: Pagination,
  ) { }

  toResponse(
    meta: ApiCollectionResponse<T>["meta"],
  ): ApiCollectionResponse<T> {
    return {
      success: true,
      data: this.data,
      pagination: this.pagination,
      meta,
    };
  }
}