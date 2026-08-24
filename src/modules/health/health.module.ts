import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module.js";

import { QueueModule } from "../../queue/queue.module.js";
import { HealthController } from "./controllers/health.controller.js";
import { DatabaseHealthIndicator } from "./indicators/database-health.indicator.js";
import { RabbitMqHealthIndicator } from "./indicators/rabbitmq-health.indicator.js";
import { HealthService } from "./services/health.service.js";

@Module({
  imports: [
    DatabaseModule,
    QueueModule
  ],

  controllers: [
    HealthController,
  ],

  providers: [
    HealthService,
    DatabaseHealthIndicator,
    RabbitMqHealthIndicator,
  ],

  exports: [
    HealthService,
  ],
})
export class HealthModule { }