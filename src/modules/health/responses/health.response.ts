export type HealthStatus = "healthy" | "degraded";

export type HealthCheckStatus = "up" | "down";

export interface HealthCheck {
  /**
   * Status of the dependency.
   */
  status: HealthCheckStatus;

  /**
   * Round-trip latency in milliseconds.
   */
  latency?: number;

  /**
   * Error message if the dependency check failed.
   */
  error?: string;
}

export interface HealthResponse {
  /**
   * Overall application health.
   */
  status: HealthStatus;

  /**
   * Service name.
   */
  service: string;

  /**
   * Service version.
   */
  version: string;

  /**
   * Runtime environment.
   */
  environment: string;

  /**
   * Application uptime in seconds.
   */
  uptime: number;

  /**
   * ISO-8601 timestamp.
   */
  timestamp: string;

  /**
   * Dependency health checks.
   */
  checks: Record<string, HealthCheck>;
}