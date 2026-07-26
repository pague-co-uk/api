import { Provider } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

import { getComponentLogger } from "@pague-co-uk/sms-gateway-telemetry";

import { AppConfigService } from "../config/config.service.js";
import { DATABASE } from "./database.constants.js";

export const databaseProvider: Provider = {
  provide: DATABASE,

  inject: [AppConfigService],

  useFactory: async (
    config: AppConfigService,
  ) => {
    const logger = getComponentLogger("database");

    logger.info("Initializing database client.");

    try {
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: config.database.url,
          },
        },
        log: config.database.log,
      });

      await prisma.$connect();

      logger.info("Database client initialized.");

      return prisma;
    } catch (error) {
      logger.error(
        { error },
        "Failed to initialize database client.",
      );

      throw error;
    }
  },
};