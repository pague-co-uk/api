export default () => ({
  app: {
    name:
      process.env.APP_NAME ??
      "sms-gateway-api",

    version:
      process.env.APP_VERSION ??
      "1.0.0",

    environment:
      process.env.NODE_ENV ??
      "development",

    host:
      process.env.HOST ??
      "0.0.0.0",

    port: Number.parseInt(
      process.env.PORT ??
      "9000",
      10,
    ),

    webUrl:
      process.env.PAGUE_WEB_URL,

    logoUrl:
      process.env.PAGUE_LOGO_URL,
  },

  // ==========================================================================
  // Database
  // ==========================================================================

  database: {
    url:
      process.env.DATABASE_URL!,
  },

  // ==========================================================================
  // RabbitMQ
  // ==========================================================================

  rabbitmq: {
    url:
      process.env.RABBITMQ_URL!,

    connectionName:
      process.env.RABBITMQ_CONNECTION_NAME ??
      "sms-gateway-api",

    heartbeat: Number.parseInt(
      process.env.RABBITMQ_HEARTBEAT ??
      "60",
      10,
    ),

    reconnectDelay: Number.parseInt(
      process.env.RABBITMQ_RECONNECT_DELAY ??
      "1000",
      10,
    ),

    maxReconnectDelay:
      Number.parseInt(
        process.env.RABBITMQ_MAX_RECONNECT_DELAY ??
        "30000",
        10,
      ),

    maxReconnectAttempts:
      process.env.RABBITMQ_MAX_RECONNECT_ATTEMPTS
        ? Number.parseInt(
          process.env.RABBITMQ_MAX_RECONNECT_ATTEMPTS,
          10,
        )
        : undefined,
  },

  // ==========================================================================
  // Telemetry
  // ==========================================================================

  telemetry: {
    enabled:
      process.env.OTEL_ENABLED !==
      "false",

    serviceName:
      process.env.OTEL_SERVICE_NAME ??
      "sms-gateway-api",

    serviceVersion:
      process.env.OTEL_SERVICE_VERSION ??
      "1.0.0",

    tracesEndpoint:
      process.env.OTEL_TRACES_ENDPOINT!,

    metricsEndpoint:
      process.env.OTEL_METRICS_ENDPOINT!,

    logsEndpoint:
      process.env.OTEL_LOGS_ENDPOINT!,

    exportIntervalMillis:
      Number.parseInt(
        process.env.OTEL_EXPORT_INTERVAL_MILLIS ??
        "10000",
        10,
      ),

    disableFsInstrumentation:
      process.env.OTEL_DISABLE_FS_INSTRUMENTATION ===
      "true",
  },

  // ==========================================================================
  // Logging
  // ==========================================================================

  log: {
    level:
      process.env.LOG_LEVEL ??
      "info",

    stdout:
      process.env.LOG_STDOUT !==
      "false",

    file: {
      enabled:
        process.env.LOG_FILE_ENABLED ===
        "true",

      path:
        process.env.LOG_FILE_PATH ??
        "./logs/application.log",
    },
  },

  // ==========================================================================
  // CORS
  // ==========================================================================

  cors: {
    enabled:
      process.env.CORS_ENABLED !==
      "false",

    origin:
      process.env.CORS_ORIGIN ??
      "*",
  },

  // ==========================================================================
  // Authentication
  // ==========================================================================

  auth: {
    jwtSecret:
      process.env.JWT_SECRET!,

    accessTokenTtl:
      process.env.JWT_ACCESS_TOKEN_TTL ??
      "15m",

    refreshTokenTtl:
      process.env.JWT_REFRESH_TOKEN_TTL ??
      "7d",

    maxFailedLoginAttempts:
      process.env.AUTH_MAX_FAILED_LOGIN_ATTEMPTS,

    accountLockDurationMinutes:
      process.env.AUTH_ACCOUNT_LOCK_DURATION_MINUTES,

    security: {
      password: {
        memoryCost:
          Number.parseInt(
            process.env.PASSWORD_MEMORY_COST ??
            "19456",
            10,
          ),

        timeCost:
          Number.parseInt(
            process.env.PASSWORD_TIME_COST ??
            "2",
            10,
          ),

        parallelism:
          Number.parseInt(
            process.env.PASSWORD_PARALLELISM ??
            "1",
            10,
          ),
      },

      secretHashKey:
        process.env.SECRET_HASH_KEY!,

      verification: {
        codeLength:
          Number.parseInt(
            process.env.VERIFICATION_CODE_LENGTH ??
            "6",
            10,
          ),

        expiryMinutes:
          Number.parseInt(
            process.env.VERIFICATION_EXPIRY_MINUTES ??
            "10",
            10,
          ),

        maxAttempts:
          Number.parseInt(
            process.env.VERIFICATION_MAX_ATTEMPTS ??
            "5",
            10,
          ),
      },

      session: {
        idleTimeoutMinutes:
          Number.parseInt(
            process.env.SESSION_IDLE_TIMEOUT_MINUTES ??
            "30",
            10,
          ),

        absoluteTimeoutDays:
          Number.parseInt(
            process.env.SESSION_ABSOLUTE_TIMEOUT_DAYS ??
            "30",
            10,
          ),

        refreshTokenTtlDays:
          Number.parseInt(
            process.env.REFRESH_TOKEN_TTL_DAYS ??
            "7",
            10,
          ),
      },
    },
  },

  // ==========================================================================
  // API
  // ==========================================================================

  api: {
    prefix:
      process.env.API_PREFIX ??
      "api",

    version:
      process.env.API_VERSION ??
      "v1",
  },

  // ==========================================================================
  // Health
  // ==========================================================================

  health: {
    timeout: Number.parseInt(
      process.env.HEALTH_CHECK_TIMEOUT ??
      "5000",
      10,
    ),
  },

  // ==========================================================================
  // Application health targets
  //
  // These are the health endpoints of the independently deployed
  // Pague applications. They are consumed by the platform health
  // aggregator, not by the applications themselves.
  // ==========================================================================

  applications: {
    health: {
      timeoutMs: Number.parseInt(
        process.env.APPLICATION_HEALTH_TIMEOUT_MS ??
        process.env.HEALTH_CHECK_TIMEOUT ??
        "5000",
        10,
      ),

      api: {
        url:
          process.env.APPLICATION_HEALTH_API_URL ??
          "http://localhost:9000/api/health",
      },

      httpClient: {
        url:
          process.env.APPLICATION_HEALTH_HTTP_CLIENT_URL ??
          "http://localhost:9001/health",
      },

      outboxPublisher: {
        url:
          process.env.APPLICATION_HEALTH_OUTBOX_PUBLISHER_URL ??
          "http://localhost:9002/health",
      },

      platformWeb: {
        url:
          process.env.APPLICATION_HEALTH_PLATFORM_WEB_URL ??
          "http://localhost:3001/health",
      },

      routingService: {
        url:
          process.env.APPLICATION_HEALTH_ROUTING_SERVICE_URL ??
          "http://localhost:9003/health",
      },

      smppClient: {
        url:
          process.env.APPLICATION_HEALTH_SMPP_CLIENT_URL ??
          "http://localhost:9004/health",
      },

      smppServer: {
        url:
          process.env.APPLICATION_HEALTH_SMPP_SERVER_URL ??
          "http://localhost:9005/health",
      },
    },
  },

  // ==========================================================================
  // SMS
  // ==========================================================================

  sms: {
    defaultSenderId:
      process.env.DEFAULT_SENDER_ID ??
      "PAGUE",

    maxSmsLength:
      Number.parseInt(
        process.env.MAX_SMS_LENGTH ??
        "160",
        10,
      ),

    maxBulkRecipients:
      Number.parseInt(
        process.env.MAX_BULK_RECIPIENTS ??
        "1000",
        10,
      ),
  },

  // ==========================================================================
  // Email
  // ==========================================================================

  email: {
    smtp: {
      host:
        process.env.SMTP_HOST!,

      port:
        Number.parseInt(
          process.env.SMTP_PORT ??
          "587",
          10,
        ),

      secure:
        process.env.SMTP_SECURE ===
        "true",

      user:
        process.env.SMTP_USER,

      password:
        process.env.SMTP_PASSWORD,
    },

    fromAddress:
      process.env.SMTP_FROM_ADDRESS!,

    fromName:
      process.env.SMTP_FROM_NAME ??
      "Pague",
  },

  // ==========================================================================
  // Webhooks
  // ==========================================================================

  webhooks: {
    secret:
      process.env.WEBHOOK_SECRET!,
  },

  // ==========================================================================
  // Rate limiting
  // ==========================================================================

  rateLimit: {
    ttl:
      Number.parseInt(
        process.env.RATE_LIMIT_TTL ??
        "60",
        10,
      ),

    limit:
      Number.parseInt(
        process.env.RATE_LIMIT_LIMIT ??
        "100",
        10,
      ),
  },

  // ==========================================================================
  // Features
  // ==========================================================================

  features: {
    swagger:
      process.env.ENABLE_SWAGGER !==
      "false",

    metrics:
      process.env.ENABLE_METRICS !==
      "false",

    tracing:
      process.env.ENABLE_TRACING !==
      "false",

    healthChecks:
      process.env.ENABLE_HEALTH_CHECKS !==
      "false",

    queueRecovery:
      process.env.ENABLE_QUEUE_RECOVERY !==
      "false",
  },

  // ==========================================================================
  // Outbox
  // ==========================================================================

  outbox: {
    batchSize:
      Number.parseInt(
        process.env.OUTBOX_BATCH_SIZE ??
        "50",
        10,
      ),

    pollIntervalMillis:
      Number.parseInt(
        process.env.OUTBOX_POLL_INTERVAL_MILLIS ??
        "1000",
        10,
      ),

    staleAfterMillis:
      Number.parseInt(
        process.env.OUTBOX_STALE_AFTER_MILLIS ??
        "300000",
        10,
      ),

    maxAttempts:
      Number.parseInt(
        process.env.OUTBOX_MAX_ATTEMPTS ??
        "10",
        10,
      ),
  },
});