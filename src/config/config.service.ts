import { Injectable } from "@nestjs/common";
import { ConfigService as NestConfigService } from "@nestjs/config";

import { EmailConfig } from "./interfaces/email-settings-config.interface.js";
import type {
  AppConfig,
  AuthenticationConfig,
  DatabaseConfig,
  OutboxConfig,
  RabbitMqConfig,
  SecurityConfig,
  TelemetryConfig,
} from "./interfaces/index.js";

@Injectable()
export class AppConfigService {
  private readonly appConfig: AppConfig;
  private readonly databaseConfig: DatabaseConfig;
  private readonly rabbitMqConfig: RabbitMqConfig;
  private readonly telemetryConfig: TelemetryConfig;
  private readonly authenticationConfig: AuthenticationConfig;
  private readonly outboxConfig: OutboxConfig;
  private readonly emailConfig: EmailConfig;

  constructor(
    private readonly configService: NestConfigService,
  ) {
    this.appConfig = Object.freeze(this.buildAppConfig());
    this.databaseConfig = Object.freeze(this.buildDatabaseConfig());
    this.rabbitMqConfig = Object.freeze(this.buildRabbitMqConfig());
    this.telemetryConfig = Object.freeze(this.buildTelemetryConfig());
    this.emailConfig = Object.freeze(this.buildEmailConfig());
    this.outboxConfig =
      Object.freeze(
        this.buildOutboxConfig(),
      );
    this.authenticationConfig = Object.freeze(
      this.buildAuthenticationConfig(),
    );
  }

  get app(): AppConfig {
    return this.appConfig;
  }

  get database(): DatabaseConfig {
    return this.databaseConfig;
  }

  get rabbitmq(): RabbitMqConfig {
    return this.rabbitMqConfig;
  }

  get telemetry(): TelemetryConfig {
    return this.telemetryConfig;
  }

  get auth(): AuthenticationConfig {
    return this.authenticationConfig;
  }

  get outbox(): OutboxConfig {
    return this.outboxConfig;
  }

  get email(): EmailConfig {
    return this.emailConfig;
  }

  public get<T>(key: string): T {
    const value = this.configService.get<T>(key);

    if (value === undefined) {
      throw new Error(
        `Configuration value '${key}' is not defined.`,
      );
    }

    return value;
  }

  public getOptional<T>(key: string): T | undefined {
    return this.configService.get<T>(key);
  }

  private buildAppConfig(): AppConfig {
    const environment = this.get<string>("app.environment");

    return {
      name: this.get("app.name"),
      version: this.get("app.version"),

      environment,

      host: this.get("app.host"),
      port: this.get("app.port"),

      isDevelopment: environment === "development",
      isProduction: environment === "production",
      isTest: environment === "test",
      webUrl: this.get("app.webUrl"),
      logoUrl: this.get("app.logoUrl")
    };
  }

  private buildDatabaseConfig(): DatabaseConfig {
    return {
      url: this.get("database.url"),

      log: this.appConfig.isDevelopment
        ? ["query", "warn", "error"]
        : ["warn", "error"],
    };
  }

  private buildEmailConfig(): EmailConfig {
    return {
      smtp: {
        host: this.get("email.smtp.host"),
        port: this.get("email.smtp.port"),
        secure: this.get("email.smtp.secure"),

        // Optional — some SMTP relays (internal relay, Mailhog/Mailpit
        // in local dev) don't require auth at all.
        user: this.getOptional("email.smtp.user"),
        password: this.getOptional("email.smtp.password"),
      },

      fromAddress: this.get("email.fromAddress"),
      fromName: this.get("email.fromName"),
    };
  }

  private buildRabbitMqConfig(): RabbitMqConfig {
    return {
      url: this.get("rabbitmq.url"),

      connectionName:
        this.getOptional<string>("rabbitmq.connectionName") ??
        this.appConfig.name,

      heartbeat: this.getOptional(
        "rabbitmq.heartbeat",
      ),

      reconnectDelay: this.getOptional(
        "rabbitmq.reconnectDelay",
      ),

      maxReconnectDelay: this.getOptional(
        "rabbitmq.maxReconnectDelay",
      ),

      maxReconnectAttempts: this.getOptional(
        "rabbitmq.maxReconnectAttempts",
      ),
    };
  }

  private buildOutboxConfig(): OutboxConfig {
    return {
      batchSize: this.get(
        "outbox.batchSize",
      ),

      pollIntervalMillis: this.get(
        "outbox.pollIntervalMillis",
      ),

      staleAfterMillis: this.get(
        "outbox.staleAfterMillis",
      ),

      maxAttempts: this.get(
        "outbox.maxAttempts",
      ),
    };
  }

  private buildAuthenticationConfig(): AuthenticationConfig {
    return {
      jwtSecret: this.get(
        "auth.jwtSecret",
      ),

      accessTokenTtl: this.get(
        "auth.accessTokenTtl",
      ),

      refreshTokenTtl: this.get(
        "auth.refreshTokenTtl",
      ),

      maxFailedLoginAttempts: this.get(
        "auth.maxFailedLoginAttempts",
      ),

      accountLockDurationMinutes: this.get(
        "auth.accountLockDurationMinutes",
      ),

      security: this.buildSecurityConfig(),
    };
  }

  private buildSecurityConfig(): SecurityConfig {
    return {
      password: {
        memoryCost: this.get(
          "auth.security.password.memoryCost",
        ),

        timeCost: this.get(
          "auth.security.password.timeCost",
        ),

        parallelism: this.get(
          "auth.security.password.parallelism",
        ),
      },

      secretHashKey: this.get(
        "auth.security.secretHashKey",
      ),

      verification: {
        codeLength: this.get(
          "auth.security.verification.codeLength",
        ),

        expiryMinutes: this.get(
          "auth.security.verification.expiryMinutes",
        ),

        maxAttempts: this.get(
          "auth.security.verification.maxAttempts",
        ),
      },

      session: {
        idleTimeoutMinutes: this.get(
          "auth.security.session.idleTimeoutMinutes",
        ),

        absoluteTimeoutDays: this.get(
          "auth.security.session.absoluteTimeoutDays",
        ),

        refreshTokenTtlDays: this.get(
          "auth.security.session.refreshTokenTtlDays",
        ),
      },
    };
  }

  private buildTelemetryConfig(): TelemetryConfig {
    return {
      enabled: this.get(
        "telemetry.enabled",
      ),

      serviceName: this.get(
        "telemetry.serviceName",
      ),

      serviceVersion: this.get(
        "telemetry.serviceVersion",
      ),

      tracesEndpoint: this.get(
        "telemetry.tracesEndpoint",
      ),

      metricsEndpoint: this.get(
        "telemetry.metricsEndpoint",
      ),

      logsEndpoint: this.get(
        "telemetry.logsEndpoint",
      ),
    };
  }
}