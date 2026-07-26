import { NestFactory } from "@nestjs/core";
import {
  getLogger,
  initTelemetry,
  shutdownTelemetry,
} from "@pague-co-uk/sms-gateway-telemetry";

import { AppModule } from "./app.module.js";
import configuration from "./config/configuration.js";
import { AppConfigService } from "./config/config.service.js";

async function bootstrap(): Promise<void> {
  const config = configuration();
  initTelemetry({
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

  const app = await NestFactory.create(AppModule);

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