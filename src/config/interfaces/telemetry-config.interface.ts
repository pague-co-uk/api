export interface TelemetryConfig {
  readonly enabled: boolean;

  readonly serviceName: string;
  readonly serviceVersion: string;

  readonly tracesEndpoint: string;
  readonly metricsEndpoint: string;
  readonly logsEndpoint: string;
}