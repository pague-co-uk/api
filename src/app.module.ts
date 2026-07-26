import { Module } from "@nestjs/common";

import { ConfigModule } from "./config/config.module.js";
import { DatabaseModule } from "./database/index.js";
import { QueueModule } from "./queue/index.js";
import { HealthModule } from "./modules/health/health.module.js";

@Module({
  imports: [ConfigModule, DatabaseModule, QueueModule, HealthModule],
})
export class AppModule {}