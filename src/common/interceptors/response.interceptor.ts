import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { ApiCollectionResponseDto } from "../interfaces/api-collection.response.interface.js";
import { ApiSuccessResponseDto } from "../interfaces/api-success.response.interface.js";
import { PaginatedResponse } from "../interfaces/paginated.response.js";
import { UnPaginatedResponse } from "../interfaces/unpaginated.response.js";

@Injectable()
export class ResponseInterceptor<T>
  implements
  NestInterceptor<
    T,
    ApiSuccessResponseDto | ApiCollectionResponseDto
  > {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<
    ApiSuccessResponseDto | ApiCollectionResponseDto
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