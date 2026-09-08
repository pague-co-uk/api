export interface ApplicationHealthTarget {
  readonly name: string;

  readonly url: string;

  readonly timeoutMs: number;
}

export interface ApplicationHealthConfig {
  readonly api: ApplicationHealthTarget;

  readonly httpClient: ApplicationHealthTarget;

  readonly outboxPublisher: ApplicationHealthTarget;

  readonly platformWeb: ApplicationHealthTarget;

  readonly routingService: ApplicationHealthTarget;

  readonly smppClient: ApplicationHealthTarget;

  readonly smppServer: ApplicationHealthTarget;
}