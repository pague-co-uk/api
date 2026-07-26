export interface RabbitMqConfig {
  readonly url: string;

  readonly connectionName: string;

  readonly heartbeat?: number;

  readonly reconnectDelay?: number;

  readonly maxReconnectDelay?: number;

  readonly maxReconnectAttempts?: number;
}