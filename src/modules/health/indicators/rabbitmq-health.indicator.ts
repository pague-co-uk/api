import { Inject, Injectable } from "@nestjs/common";
import { QueueClient } from "@pague-co-uk/sms-gateway-queue-client";
import {
  Loggers,
} from "@pague-co-uk/sms-gateway-telemetry";

import { QUEUE_CLIENT } from "../../../queue/constants/queue.constants.js";

import type { HealthCheck } from "../responses/health.response.js";
import type { HealthIndicator } from "./health-indicator.interface.js";

@Injectable()
export class RabbitMqHealthIndicator
  implements HealthIndicator {
  public readonly name = "rabbitmq";

  private readonly logger =
    Loggers.rabbitmq;

  constructor(
    @Inject(QUEUE_CLIENT)
    private readonly client: QueueClient,
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

      if (!this.client.connected) {
        this.logger.warn(
          { latency },
          "RabbitMQ client is disconnected.",
        );

        return {
          status: "down",
          latency,
          error: "RabbitMQ client is disconnected.",
        };
      }

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