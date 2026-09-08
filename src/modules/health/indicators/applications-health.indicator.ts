import {
  Injectable,
} from "@nestjs/common";

import {
  Loggers,
} from "@pague-co-uk/sms-gateway-telemetry";

import {
  AppConfigService,
} from "../../../config/config.service.js";

import type {
  ApplicationHealthTarget,
} from "../../../config/interfaces/application-health-config.interface.js";

import type {
  HealthCheck,
} from "../responses/health.response.js";

import type {
  HealthIndicator,
} from "./health-indicator.interface.js";

// ============================================================================
// Applications Health Indicator
// ============================================================================

@Injectable()
export class ApplicationsHealthIndicator
  implements HealthIndicator {
  public readonly name =
    "applications";

  private readonly logger =
    Loggers.app;

  constructor(
    private readonly config: AppConfigService,
  ) { }

  // ==========================================================================
  // Check
  // ==========================================================================

  public async check(): Promise<HealthCheck> {
    const applications =
      Object.values(
        this.config.applications,
      );

    const results =
      await Promise.all(
        applications.map(
          async (application) => ({
            name:
              application.name,

            result:
              application.name ===
                "api"
                ? await this.checkLocalApplication()
                : await this.checkApplication(
                  application,
                ),
          }),
        ),
      );

    const details: Record<
      string,
      HealthCheck
    > = {};

    let healthy = true;

    for (const {
      name,
      result,
    } of results) {
      details[name] = result;

      if (
        result.status ===
        "down"
      ) {
        healthy = false;
      }
    }

    const latencies =
      Object.values(details).map(
        (check) =>
          check.latency,
      );

    const latency =
      latencies.length > 0
        ? Math.max(...latencies)
        : 0;

    return {
      status: healthy
        ? "up"
        : "down",

      latency,

      details,
    };
  }

  // ==========================================================================
  // Local application check
  // ==========================================================================

  private async checkLocalApplication(): Promise<HealthCheck> {
    const start =
      performance.now();

    /*
     * The control-plane API does not make an HTTP request to itself.
     *
     * Reaching this method means the API process, NestJS application,
     * health module, and platform health service are already executing.
     *
     * The API's dependencies are checked separately by the database and
     * RabbitMQ health indicators.
     */

    const latency =
      Math.round(
        performance.now() -
        start,
      );

    this.logger.debug(
      {
        application: "api",
        latency,
      },
      "Local application health check completed.",
    );

    return {
      status: "up",
      latency,
    };
  }

  // ==========================================================================
  // Individual remote application check
  // ==========================================================================

  private async checkApplication(
    application: ApplicationHealthTarget,
  ): Promise<HealthCheck> {
    const start =
      performance.now();

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        application.timeoutMs,
      );

    try {
      const response =
        await fetch(
          application.url,
          {
            method: "GET",

            signal:
              controller.signal,

            headers: {
              Accept:
                "application/json",
            },

            cache: "no-store",
          },
        );

      const latency =
        Math.round(
          performance.now() -
          start,
        );

      if (!response.ok) {
        const error =
          `Health endpoint returned HTTP ${response.status}.`;

        this.logger.warn(
          {
            application:
              application.name,

            statusCode:
              response.status,

            latency,
          },
          "Application health check failed.",
        );

        return {
          status: "down",
          latency,
          error,
        };
      }

      let body: unknown;

      try {
        body =
          await response.json();
      } catch {
        const error =
          "Health endpoint returned an invalid JSON response.";

        this.logger.warn(
          {
            application: application.name,
            url: application.url,
            latency,
          },
          "Application health check returned invalid JSON.",
        );

        return {
          status: "down",
          latency,
          error,
        };
      }

      if (
        !this.isHealthyResponse(
          body,
        )
      ) {
        const error =
          "Health endpoint returned an unhealthy status.";

        this.logger.warn(
          {
            application:
              application.name,

            latency,
          },
          "Application reported unhealthy status.",
        );

        return {
          status: "down",
          latency,
          error,
        };
      }

      this.logger.debug(
        {
          application:
            application.name,

          latency,
        },
        "Application health check completed.",
      );

      return {
        status: "up",
        latency,
      };
    } catch (error) {
      const latency =
        Math.round(
          performance.now() - start,
        );

      const message =
        this.getErrorMessage(error);

      this.logger.warn(
        {
          application:
            application.name,

          url:
            application.url,

          latency,

          error:
            message,

          errorName:
            error instanceof Error
              ? error.name
              : undefined,

          errorCause:
            error instanceof Error
              ? error.cause
              : undefined,

          errorStack:
            error instanceof Error
              ? error.stack
              : undefined,
        },
        "Application health check failed.",
      );

      return {
        status: "down",
        latency,
        error: message,
      };
    } finally {
      clearTimeout(
        timeout,
      );
    }
  }

  // ==========================================================================
  // Response validation
  // ==========================================================================

  private isHealthyResponse(
    value: unknown,
  ): boolean {
    if (
      typeof value !==
      "object" ||
      value === null
    ) {
      return false;
    }

    const response =
      value as {
        status?: unknown;
      };

    return (
      response.status ===
      "healthy"
    );
  }

  // ==========================================================================
  // Error handling
  // ==========================================================================

  private getErrorMessage(
    error: unknown,
  ): string {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      return "Health check timed out.";
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Unable to reach application health endpoint.";
  }
}