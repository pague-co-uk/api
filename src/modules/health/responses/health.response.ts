// ============================================================================
// Health response
// ============================================================================

export type HealthStatus =
  | "up"
  | "down";

export type OverallHealthStatus =
  | "healthy"
  | "degraded";

export interface HealthCheck {
  readonly status: HealthStatus;

  readonly latency: number;

  readonly error?: string;

  readonly details?: Record<
    string,
    HealthCheck
  >;
}

export interface HealthResponse {
  readonly status: OverallHealthStatus;

  readonly service: string;

  readonly version: string;

  readonly environment: string;

  readonly uptime: number;

  readonly timestamp: string;

  readonly checks: Record<
    string,
    HealthCheck
  >;
}