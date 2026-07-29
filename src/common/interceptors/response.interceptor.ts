import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { ApiCollectionResponse } from "../interfaces/api-collection.response.interface.js";
import { ApiSuccessResponse } from "../interfaces/api-success.response.interface.js";
import { PaginatedResponse } from "../interfaces/paginated.response.js";
import { UnPaginatedResponse } from "../interfaces/unpaginated.response.js";

@Injectable()
export class ResponseInterceptor<T>
  implements
  NestInterceptor<
    T,
    ApiSuccessResponse<unknown> | ApiCollectionResponse<unknown>
  > {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<
    ApiSuccessResponse<unknown> | ApiCollectionResponse<unknown>
  > {
    const request = context
      .switchToHttp()
      .getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        const meta = {
          requestId:
            (
              request as Request & {
                requestId?: string;
              }
            ).requestId ?? "",
          timestamp: new Date().toISOString(),
        };

        if (data instanceof UnPaginatedResponse) {
          return data.toResponse(meta);
        }

        if (data instanceof PaginatedResponse) {
          return data.toResponse(meta);
        }

        return {
          success: true,
          data,
          meta,
        };
      }),
    );
  }
}