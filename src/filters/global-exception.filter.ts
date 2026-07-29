import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import {
  Counter,
  SpanStatusCode,
  trace
} from "@opentelemetry/api";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

import { getComponentLogger, getMeter } from "@pague-co-uk/sms-gateway-telemetry";
import { ApiErrorResponse } from "src/common/interfaces/api-error.response.interface.js";
import { DomainException } from "../exceptions/domain.exception.js";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly exceptionCounter: Counter;
  private readonly logger =
    getComponentLogger(
      GlobalExceptionFilter.name,
    );
  constructor(
  ) {
    this.exceptionCounter = getMeter().createCounter(
      "http.server.exceptions",
      {
        description:
          "Total HTTP exceptions handled by the global exception filter",
      },
    );
  }

  catch(
    exception: unknown,
    host: ArgumentsHost,
  ): void {
    const context = host.switchToHttp();

    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const body = this.buildResponse(
      exception,
      request,
    );

    this.recordException(
      exception,
      request,
      body,
    );

    response
      .status(body.status)
      .json(body.response);
  }

  private recordException(
    exception: unknown,
    request: Request,
    body: {
      status: number;
      response: ApiErrorResponse;
    },
  ): void {
    const error =
      exception instanceof Error
        ? exception
        : new Error(String(exception));

    const span = trace.getActiveSpan();

    span?.recordException(error);

    span?.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });

    this.exceptionCounter.add(1, {
      "http.method": request.method,
      "http.route":
        request.route?.path ??
        request.path,
      "http.status_code": body.status,
      "error.code":
        body.response.error.code,
      "exception.type":
        error.constructor.name,
    });

    this.logger.error(
      {
        method: request.method,
        path: request.originalUrl,
        status: body.status,
        requestId:
          (
            request as Request & {
              requestId?: string;
            }
          ).requestId,
        errorCode:
          body.response.error.code,
        exception,
      },
      "HTTP request failed.",
    );
  }

  private buildResponse(
    exception: unknown,
    request: Request,
  ): {
    status: number;
    response: ApiErrorResponse;
  } {
    //
    // Domain exceptions
    //
    if (exception instanceof DomainException) {
      return {
        status: exception.status,
        response: this.errorResponse(
          exception.status,
          exception.code,
          exception.message,
          exception.details ?? [],
          request,
        ),
      };
    }

    //
    // Nest HTTP exceptions
    //
    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      const payload = exception.getResponse();

      const message =
        typeof payload === "string"
          ? payload
          : (payload as { message?: unknown })
            .message ??
          exception.message;

      return {
        status,
        response: this.errorResponse(
          status,
          HttpStatus[status] ??
          "HTTP_ERROR",
          Array.isArray(message)
            ? "Validation failed."
            : String(message),
          Array.isArray(message)
            ? message
            : [],
          request,
        ),
      };
    }

    //
    // Prisma
    //
    if (
      exception instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      return this.handlePrisma(
        exception,
        request,
      );
    }

    //
    // Unknown
    //
    return {
      status:
        HttpStatus.INTERNAL_SERVER_ERROR,
      response: this.errorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "INTERNAL_SERVER_ERROR",
        "An unexpected error occurred.",
        [],
        request,
      ),
    };
  }

  private handlePrisma(
    exception: Prisma.PrismaClientKnownRequestError,
    request: Request,
  ): {
    status: number;
    response: ApiErrorResponse;
  } {
    switch (exception.code) {
      case "P2002":
        return {
          status: HttpStatus.CONFLICT,
          response: this.errorResponse(
            HttpStatus.CONFLICT,
            "DUPLICATE_RESOURCE",
            "A resource with the same unique value already exists.",
            [],
            request,
          ),
        };

      case "P2025":
        return {
          status: HttpStatus.NOT_FOUND,
          response: this.errorResponse(
            HttpStatus.NOT_FOUND,
            "RESOURCE_NOT_FOUND",
            "The requested resource could not be found.",
            [],
            request,
          ),
        };

      default:
        return {
          status:
            HttpStatus.INTERNAL_SERVER_ERROR,
          response: this.errorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "DATABASE_ERROR",
            "A database error occurred.",
            [],
            request,
          ),
        };
    }
  }

  private errorResponse(
    status: number,
    code: string,
    message: string,
    details: unknown[],
    request: Request,
  ): ApiErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        path: request.originalUrl,
      },
      meta: {
        requestId:
          (
            request as Request & {
              requestId?: string;
            }
          ).requestId ?? "",
        timestamp:
          new Date().toISOString(),
      },
    };
  }
}