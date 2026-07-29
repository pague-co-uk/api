import type { ApiSuccessResponse } from "./api-success.response.interface.js";

export class UnPaginatedResponse<T> {
  constructor(
    public readonly data: T,
  ) { }

  toResponse(meta: ApiSuccessResponse<T>["meta"]): ApiSuccessResponse<T> {
    return {
      success: true,
      data: this.data,
      meta,
    };
  }
}