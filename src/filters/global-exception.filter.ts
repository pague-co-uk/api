import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

import {
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";

import { Prisma } from "@prisma/client";
import {
  Request,
  Response,
} from "express";

import {
  createCounterMetric,
  getComponentLogger,
} from "@pague-co-uk/sms-gateway-telemetry";

import {
  ApiErrorResponse,
} from "../common/interfaces/api-error.response.interface.js";

import {
  DomainException,
} from "../exceptions/domain.exception.js";

@Catch()
export class GlobalExceptionFilter
  implements ExceptionFilter {
  private readonly exceptionCounter =
    createCounterMetric({
      name: "http.server.exceptions",
      description:
        "Total HTTP exceptions handled by the global exception filter",
    });

  private readonly logger =
    getComponentLogger(
      GlobalExceptionFilter.name,
    );

  catch(
    exception: unknown,
    host: ArgumentsHost,
  ): void {
    const context =
      host.switchToHttp();

    const request =
      context.getRequest<Request>();

    const response =
      context.getResponse<Response>();

    const body =
      this.buildResponse(
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
        : new Error(
          String(exception),
        );

    const span =
      trace.getActiveSpan();

    span?.recordException(
      error,
    );

    span?.setStatus({
      code:
        SpanStatusCode.ERROR,
      message:
        error.message,
    });

    this.exceptionCounter.add(
      1,
      {
        "http.method":
          request.method,

        "http.route":
          request.route?.path ??
          request.path,

        "http.status_code":
          body.status,

        "error.code":
          body.response.error
            .code,

        "exception.type":
          error.constructor
            .name,
      },
    );

    this.logger.error(
      {
        method:
          request.method,

        path:
          request.originalUrl,

        status:
          body.status,

        requestId:
          (
            request as Request & {
              requestId?: string;
            }
          ).requestId,

        errorCode:
          body.response.error
            .code,

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
    if (
      exception instanceof
      DomainException
    ) {
      return {
        status:
          exception.status,

        response:
          this.errorResponse(
            exception.status,
            exception.code,
            exception.message,
            exception.details ??
            [],
            request,
          ),
      };
    }

    //
    // Nest HTTP exceptions
    //
    if (
      exception instanceof
      HttpException
    ) {
      const status =
        exception.getStatus();

      const payload =
        exception.getResponse();

      const payloadObject =
        this.isRecord(
          payload,
        )
          ? payload
          : null;

      const message =
        typeof payload ===
          "string"
          ? payload
          : this.getHttpExceptionMessage(
            payloadObject,
            exception.message,
          );

      const details =
        this.getHttpExceptionDetails(
          payloadObject,
        );

      return {
        status,

        response:
          this.errorResponse(
            status,

            HttpStatus[status] ??
            "HTTP_ERROR",

            Array.isArray(
              message,
            )
              ? "Validation failed."
              : String(message),

            details,

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

      response:
        this.errorResponse(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "INTERNAL_SERVER_ERROR",
          "An unexpected error occurred.",
          [],
          request,
        ),
    };
  }

  private getHttpExceptionMessage(
    payload:
      | Record<string, unknown>
      | null,
    fallback: string,
  ): unknown {
    if (!payload) {
      return fallback;
    }

    return (
      payload.message ??
      fallback
    );
  }

  private getHttpExceptionDetails(
    payload:
      | Record<string, unknown>
      | null,
  ): unknown[] {
    if (!payload) {
      return [];
    }

    //
    // Custom application exceptions such as:
    //
    // {
    //   message: "...",
    //   errors: [...]
    // }
    //
    if (
      Array.isArray(
        payload.errors,
      )
    ) {
      return payload.errors;
    }

    //
    // Domain-style structured details.
    //
    if (
      Array.isArray(
        payload.details,
      )
    ) {
      return payload.details;
    }

    return [];
  }

  private isRecord(
    value: unknown,
  ): value is Record<
    string,
    unknown
  > {
    return (
      typeof value ===
      "object" &&
      value !== null &&
      !Array.isArray(value)
    );
  }

  private handlePrisma(
    exception:
      Prisma.PrismaClientKnownRequestError,
    request: Request,
  ): {
    status: number;
    response: ApiErrorResponse;
  } {
    switch (
    exception.code
    ) {
      case "P2002":
        return {
          status:
            HttpStatus.CONFLICT,

          response:
            this.errorResponse(
              HttpStatus.CONFLICT,
              "DUPLICATE_RESOURCE",
              "A resource with the same unique value already exists.",
              [],
              request,
            ),
        };

      case "P2025":
        return {
          status:
            HttpStatus.NOT_FOUND,

          response:
            this.errorResponse(
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

          response:
            this.errorResponse(
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
        path:
          request.originalUrl,
      },

      meta: {
        requestId:
          (
            request as Request & {
              requestId?: string;
            }
          ).requestId ??
          "",

        timestamp:
          new Date().toISOString(),
      },
    };
  }
}