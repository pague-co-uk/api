import { Injectable } from "@nestjs/common";
import { ConfigService as NestConfigService } from "@nestjs/config";

import { EmailConfig } from "./interfaces/email-settings-config.interface.js";

import type {
  AppConfig,
  ApplicationHealthConfig,
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

  private readonly applicationHealthConfig: ApplicationHealthConfig;

  constructor(
    private readonly configService: NestConfigService,
  ) {
    this.appConfig =
      Object.freeze(
        this.buildAppConfig(),
      );

    this.databaseConfig =
      Object.freeze(
        this.buildDatabaseConfig(),
      );

    this.rabbitMqConfig =
      Object.freeze(
        this.buildRabbitMqConfig(),
      );

    this.telemetryConfig =
      Object.freeze(
        this.buildTelemetryConfig(),
      );

    this.emailConfig =
      Object.freeze(
        this.buildEmailConfig(),
      );

    this.outboxConfig =
      Object.freeze(
        this.buildOutboxConfig(),
      );

    this.authenticationConfig =
      Object.freeze(
        this.buildAuthenticationConfig(),
      );

    this.applicationHealthConfig =
      Object.freeze(
        this.buildApplicationHealthConfig(),
      );
  }

  // ==========================================================================
  // Public configuration
  // ==========================================================================

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

  get applications(): ApplicationHealthConfig {
    return this.applicationHealthConfig;
  }

  // ==========================================================================
  // Generic configuration access
  // ==========================================================================

  public get<T>(key: string): T {
    const value =
      this.configService.get<T>(
        key,
      );

    if (value === undefined) {
      throw new Error(
        `Configuration value '${key}' is not defined.`,
      );
    }

    return value;
  }

  public getOptional<T>(
    key: string,
  ): T | undefined {
    return this.configService.get<T>(
      key,
    );
  }

  // ==========================================================================
  // Application
  // ==========================================================================

  private buildAppConfig(): AppConfig {
    const environment =
      this.get<string>(
        "app.environment",
      );

    return {
      name: this.get(
        "app.name",
      ),

      version: this.get(
        "app.version",
      ),

      environment,

      host: this.get(
        "app.host",
      ),

      port: this.get(
        "app.port",
      ),

      isDevelopment:
        environment ===
        "development",

      isProduction:
        environment ===
        "production",

      isTest:
        environment === "test",

      webUrl: this.get(
        "app.webUrl",
      ),

      logoUrl: this.get(
        "app.logoUrl",
      ),
    };
  }

  // ==========================================================================
  // Application health targets
  // ==========================================================================

  private buildApplicationHealthConfig(): ApplicationHealthConfig {
    const timeoutMs =
      this.get<number>(
        "applications.health.timeoutMs",
      );

    return {
      api: {
        name: "api",

        url: this.get(
          "applications.health.api.url",
        ),

        timeoutMs,
      },

      httpClient: {
        name: "http-client",

        url: this.get(
          "applications.health.httpClient.url",
        ),

        timeoutMs,
      },

      outboxPublisher: {
        name: "outbox-publisher",

        url: this.get(
          "applications.health.outboxPublisher.url",
        ),

        timeoutMs,
      },

      platformWeb: {
        name: "pague-platform-web",

        url: this.get(
          "applications.health.platformWeb.url",
        ),

        timeoutMs,
      },

      routingService: {
        name: "routing-service",

        url: this.get(
          "applications.health.routingService.url",
        ),

        timeoutMs,
      },

      smppClient: {
        name: "smpp-client",

        url: this.get(
          "applications.health.smppClient.url",
        ),

        timeoutMs,
      },

      smppServer: {
        name: "smpp-server",

        url: this.get(
          "applications.health.smppServer.url",
        ),

        timeoutMs,
      },
    };
  }

  // ==========================================================================
  // Database
  // ==========================================================================

  private buildDatabaseConfig(): DatabaseConfig {
    return {
      url: this.get(
        "database.url",
      ),

      log: this.appConfig.isDevelopment
        ? [
          "query",
          "warn",
          "error",
        ]
        : [
          "warn",
          "error",
        ],
    };
  }

  // ==========================================================================
  // Email
  // ==========================================================================

  private buildEmailConfig(): EmailConfig {
    return {
      smtp: {
        host: this.get(
          "email.smtp.host",
        ),

        port: this.get(
          "email.smtp.port",
        ),

        secure: this.get(
          "email.smtp.secure",
        ),

        user: this.getOptional(
          "email.smtp.user",
        ),

        password:
          this.getOptional(
            "email.smtp.password",
          ),
      },

      fromAddress: this.get(
        "email.fromAddress",
      ),

      fromName: this.get(
        "email.fromName",
      ),
    };
  }

  // ==========================================================================
  // RabbitMQ
  // ==========================================================================

  private buildRabbitMqConfig(): RabbitMqConfig {
    return {
      url: this.get(
        "rabbitmq.url",
      ),

      connectionName:
        this.getOptional<string>(
          "rabbitmq.connectionName",
        ) ??
        this.appConfig.name,

      heartbeat:
        this.getOptional(
          "rabbitmq.heartbeat",
        ),

      reconnectDelay:
        this.getOptional(
          "rabbitmq.reconnectDelay",
        ),

      maxReconnectDelay:
        this.getOptional(
          "rabbitmq.maxReconnectDelay",
        ),

      maxReconnectAttempts:
        this.getOptional(
          "rabbitmq.maxReconnectAttempts",
        ),
    };
  }

  // ==========================================================================
  // Outbox
  // ==========================================================================

  private buildOutboxConfig(): OutboxConfig {
    return {
      batchSize: this.get(
        "outbox.batchSize",
      ),

      pollIntervalMillis:
        this.get(
          "outbox.pollIntervalMillis",
        ),

      staleAfterMillis:
        this.get(
          "outbox.staleAfterMillis",
        ),

      maxAttempts: this.get(
        "outbox.maxAttempts",
      ),
    };
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

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

      maxFailedLoginAttempts:
        this.get(
          "auth.maxFailedLoginAttempts",
        ),

      accountLockDurationMinutes:
        this.get(
          "auth.accountLockDurationMinutes",
        ),

      security:
        this.buildSecurityConfig(),
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

        expiryMinutes:
          this.get(
            "auth.security.verification.expiryMinutes",
          ),

        maxAttempts:
          this.get(
            "auth.security.verification.maxAttempts",
          ),
      },

      session: {
        idleTimeoutMinutes:
          this.get(
            "auth.security.session.idleTimeoutMinutes",
          ),

        absoluteTimeoutDays:
          this.get(
            "auth.security.session.absoluteTimeoutDays",
          ),

        refreshTokenTtlDays:
          this.get(
            "auth.security.session.refreshTokenTtlDays",
          ),
      },
    };
  }

  // ==========================================================================
  // Telemetry
  // ==========================================================================

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

      tracesEndpoint:
        this.get(
          "telemetry.tracesEndpoint",
        ),

      metricsEndpoint:
        this.get(
          "telemetry.metricsEndpoint",
        ),

      logsEndpoint:
        this.get(
          "telemetry.logsEndpoint",
        ),
    };
  }
}