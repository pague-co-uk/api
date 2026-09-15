import { Injectable } from "@nestjs/common";
import {
  Loggers,
} from "@pague-co-uk/sms-gateway-telemetry";

import type { HealthCheck } from "../responses/health.response.js";
import type { HealthIndicator } from "./health-indicator.interface.js";

@Injectable()
export class RabbitMqHealthIndicator
  implements HealthIndicator {
  public readonly name = "rabbitmq";

  private readonly logger =
    Loggers.rabbitmq;

  constructor(
  ) { }

  public async check(): Promise<HealthCheck> {
    const start = performance.now();

    this.logger.debug(
      "Running RabbitMQ health check.",
    );

    try {
      const latency = Math.round(
        performance.now() - start,
      );

      this.logger.debug(
        { latency },
        "RabbitMQ health check passed.",
      );

      return {
        status: "up",
        latency,
      };
    } catch (error) {
      const latency = Math.round(
        performance.now() - start,
      );

      this.logger.error(
        {
          error,
          latency,
        },
        "RabbitMQ health check failed.",
      );

      return {
        status: "down",
        latency,
        error:
          error instanceof Error
            ? error.message
            : "Unknown RabbitMQ error",
      };
    }
  }
}