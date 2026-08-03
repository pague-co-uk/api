import 'dotenv/config';

import {
  getLogger,
  initTelemetry,
  shutdownTelemetry,
  TelemetryLogger,
} from "@pague-co-uk/sms-gateway-telemetry";

import configuration from "./config/configuration.js";

async function bootstrap(): Promise<void> {
  const config = configuration();
  initTelemetry({
    enabled: config.telemetry.enabled,
    registerShutdownHooks: false,
    service: {
      name: config.telemetry.serviceName,
      version: config.telemetry.serviceVersion,
    },
    collector: {
      tracesEndpoint: config.telemetry.tracesEndpoint,
      metricsEndpoint: config.telemetry.metricsEndpoint,
    },
    metrics: {
      exportIntervalMillis:
        config.telemetry.exportIntervalMillis,
    },
    logger: {
      level: config.log.level,
      transport: {
        stdout: config.log.stdout,
        file: config.log.file,
      },
    },
    instrumentations: {
      disableFs:
        config.telemetry.disableFsInstrumentation,
    },
  });

  const logger = getLogger();

  const [
    { NestFactory },
    { ValidationPipe },
    { AppModule },
    { AppConfigService },
    { createHttpMiddleware },
  ] = await Promise.all([
    import("@nestjs/core"),
    import("@nestjs/common"),
    import("./app.module.js"),
    import("./config/config.service.js"),
    import("@pague-co-uk/sms-gateway-telemetry"),
  ]);

  const app = await NestFactory.create(AppModule);
  app.useLogger(new TelemetryLogger());

  app.use(createHttpMiddleware({
    context: {
      generateRequestId: true,
      generateCorrelationId: true,
    },
  }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const configService = app.get(AppConfigService);

  app.setGlobalPrefix(
    configService.get<string>("api.prefix"),
  );

  app.enableShutdownHooks();

  await app.listen(
    configService.get<number>("app.port"),
  );

  logger.info(
    {
      port: configService.get<number>("app.port"),
    },
    "Application started successfully.",
  );

  const gracefulShutdown = async (
    signal: string,
  ): Promise<void> => {
    logger.info({ signal }, "Shutting down application.");

    await app.close();
    await shutdownTelemetry();

    process.exit(0);
  };

  process.once("SIGINT", () => {
    void gracefulShutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void gracefulShutdown("SIGTERM");
  });
}

void bootstrap();
