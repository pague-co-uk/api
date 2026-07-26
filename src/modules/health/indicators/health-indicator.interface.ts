import type { HealthCheck } from "../responses/health.response.js";

/**
 * Contract implemented by all health indicators.
 */
export interface HealthIndicator {
  /**
   * Unique name of the dependency.
   *
   * Examples:
   *  - database
   *  - rabbitmq
   *  - redis
   *  - telemetry
   */
  readonly name: string;

  /**
   * Performs the dependency health check.
   */
  check(): Promise<HealthCheck>;
}