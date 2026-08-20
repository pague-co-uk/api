export interface OutboxConfig {
  readonly batchSize: number;
  readonly pollIntervalMillis: number;
  readonly staleAfterMillis: number;
  readonly maxAttempts: number;
}