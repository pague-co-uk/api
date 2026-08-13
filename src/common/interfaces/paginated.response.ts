import type { Page } from "../query/page.interface.js";
import type { ApiCollectionResponseDto } from "./api-collection.response.interface.js";
import type { ApiPaginationDto } from "./api-pagination.interface.js";

export class PaginatedResponse<T> {
  public readonly data: T[];

  public readonly pagination: ApiPaginationDto;

  constructor(
    items: readonly T[],
    page: Page<unknown>,
  ) {
    this.data = Array.from(items);
    this.pagination = {
      page: page.page,
      pageSize: page.pageSize,
      totalItems: page.totalItems,
      totalPages: Math.ceil(
        page.totalItems / page.pageSize,
      ),
      hasNext:
        page.page * page.pageSize < page.totalItems,
      hasPrevious: page.page > 1,
    };
  }

  toResponse(
    meta: ApiCollectionResponseDto["meta"],
  ): ApiCollectionResponseDto {
    return {
      success: true,
      data: this.data,
      pagination: this.pagination,
      meta,
    };
  }
}
