import type { ApiSuccessResponseDto } from "./api-success.response.interface.js";

export class UnPaginatedResponse<T> {
  constructor(
    public readonly data: T,
  ) { }

  toResponse(meta: ApiSuccessResponseDto["meta"]): ApiSuccessResponseDto {
    return {
      success: true,
      data: this.data,
      meta,
    };
  }
}