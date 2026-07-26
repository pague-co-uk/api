export interface AppConfig {
  readonly name: string;
  readonly version: string;

  readonly environment: string;

  readonly host: string;
  readonly port: number;

  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
  readonly isTest: boolean;
}