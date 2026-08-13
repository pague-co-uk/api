import { ApiMetaDto } from "./api-meta.interface.js";

export interface ApiErrorResponse {
  success: false;

  error: {
    code: string;

    message: string;

    details: unknown[];

    path: string;
  };

  meta: ApiMetaDto;
}