import { ApiCollectionResponse } from "./api-collection.response.interface.js";
import { ApiErrorResponse } from "./api-error.response.interface.js";
import { ApiSuccessResponse } from "./api-success.response.interface.js";

export type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiCollectionResponse<T>
  | ApiErrorResponse;