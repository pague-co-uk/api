import { Module } from "@nestjs/common";

import { WebhookDeliveryRepository } from "../../repositories/WebhookDeliveryRepository.js";
import { WebhookEndpointRepository } from "../../repositories/WebhookEndpointRepository.js";

import { WebhooksController } from "./controllers/webhook.controller.js";
import { WebhookService } from "./services/webhook.service.js";
import { WebhookMapper } from "./webhook.mapper.js";

@Module({
  controllers: [
    WebhooksController,
  ],

  providers: [
    WebhookEndpointRepository,
    WebhookDeliveryRepository,
    WebhookService,
    WebhookMapper,
  ],

  exports: [
    WebhookService,
  ],
})
export class WebhooksModule { }