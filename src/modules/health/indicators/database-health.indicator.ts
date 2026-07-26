import { Inject, Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { Loggers } from "@pague-co-uk/sms-gateway-telemetry";

import { DATABASE } from "../../../database/database.constants.js";

import type { HealthIndicator } from "./health-indicator.interface.js";
import type { HealthCheck } from "../responses/health.response.js";

@Injectable()
export class DatabaseHealthIndicator implements HealthIndicator {
  public readonly name = "database";

  private readonly logger = Loggers.database;

  constructor(
    @Inject(DATABASE)
    private readonly prisma: PrismaClient,
  ) {}

  public async check(): Promise<HealthCheck> {
    const start = performance.now();

    this.logger.debug("Running database health check.");

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      const latency = Math.round(
        performance.now() - start,
      );

      this.logger.debug(
        { latency },
        "Database health check passed.",
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
        "Database health check failed.",
      );

      return {
        status: "down",
        latency,
        error:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      };
    }
  }
}