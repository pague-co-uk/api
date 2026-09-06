import { Module } from "@nestjs/common";

import { WebhookDeliveryRepository } from "../../repositories/WebhookDeliveryRepository.js";
import { WebhookEndpointRepository } from "../../repositories/WebhookEndpointRepository.js";

import { RandomGenerator } from "../../common/services/random.service.js";
import { PlatformWebhooksController } from "./controllers/platform-webhooks.controller.js";
import { WebhooksController } from "./controllers/webhook.controller.js";
import { WebhookService } from "./services/webhook.service.js";
import { WebhookMapper } from "./webhook.mapper.js";

@Module({
  controllers: [
    WebhooksController,
    PlatformWebhooksController
  ],

  providers: [
    WebhookEndpointRepository,
    WebhookDeliveryRepository,
    WebhookService,
    WebhookMapper,
    RandomGenerator,
  ],

  exports: [
    WebhookService,
  ],
})
export class WebhooksModule { }