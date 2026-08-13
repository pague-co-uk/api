import { ApiCollectionResponseDto } from "./api-collection.response.interface.js";
import { ApiErrorResponse } from "./api-error.response.interface.js";
import { ApiSuccessResponseDto } from "./api-success.response.interface.js";

export type ApiResponse<T> =
  | ApiSuccessResponseDto
  | ApiCollectionResponseDto
  | ApiErrorResponse;