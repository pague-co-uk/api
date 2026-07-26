import { Injectable } from "@nestjs/common";
import { Loggers } from "@pague-co-uk/sms-gateway-telemetry";

import { AppConfigService } from "../../../config/config.service.js";

import type { HealthIndicator } from "../indicators/health-indicator.interface.js";
import type {
  HealthCheck,
  HealthResponse,
} from "../responses/health.response.js";

import { DatabaseHealthIndicator } from "../indicators/database-health.indicator.js";
import { RabbitMqHealthIndicator } from "../indicators/rabbitmq-health.indicator.js";

@Injectable()
export class HealthService {
  private readonly logger = Loggers.app;

  constructor(
    private readonly config: AppConfigService,

    private readonly database: DatabaseHealthIndicator,

    private readonly rabbitmq: RabbitMqHealthIndicator,
  ) { }

  public async check(): Promise<HealthResponse> {
    const start = performance.now();

    this.logger.debug(
      "Running application health check.",
    );

    const indicators: HealthIndicator[] = [
      this.database,
      this.rabbitmq,
    ];

    const results = await Promise.all(
      indicators.map(async (indicator) => ({
        name: indicator.name,
        result: await indicator.check(),
      })),
    );

    const checks: Record<string, HealthCheck> = {};

    let healthy = true;

    for (const { name, result } of results) {
      checks[name] = result;

      this.logger.debug(
        {
          indicator: name,
          status: result.status,
          latency: result.latency,
          error: result.error,
        },
        "Health indicator completed.",
      );

      if (result.status === "down") {
        healthy = false;
      }
    }

    const duration = Math.round(
      performance.now() - start,
    );

    const response: HealthResponse = {
      status: healthy
        ? "healthy"
        : "degraded",

      service: this.config.app.name,

      version: this.config.app.version,

      environment:
        this.config.app.environment,

      uptime: Math.round(process.uptime()),

      timestamp: new Date().toISOString(),

      checks,
    };

    this.logger.info(
      {
        status: response.status,
        duration,
        checks,
      },
      "Application health check completed.",
    );

    return response;
  }
}