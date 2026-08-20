import {
  Injectable,
} from "@nestjs/common";

import { WebhookDelivery, WebhookEndpoint } from "@prisma/client";

import {
  WebhookResponseDto
} from "./dto/webhook-response.dto.js";

import { WebhookDeliveryResponseDto } from "./dto/webhook-delivery.response.dto.js";
import {
  WebhookSecretResponseDto,
} from "./dto/webhook-secret.response.dto.js";
@Injectable()
export class WebhookMapper {
  toResponse(
    webhook: WebhookEndpoint,
  ): WebhookResponseDto {
    return {
      id:
        webhook.id,

      publicId:
        webhook.publicId,

      name:
        webhook.name,

      url:
        webhook.url,

      enabled:
        webhook.enabled,

      createdAt:
        webhook.createdAt,

      updatedAt:
        webhook.updatedAt,
    };
  }

  toResponses(
    webhooks: readonly WebhookEndpoint[],
  ): WebhookResponseDto[] {
    return webhooks.map(
      (webhook) =>
        this.toResponse(webhook),
    );
  }

  toSecretResponse(
    webhook: WebhookEndpoint,
    secret: string,
  ): WebhookSecretResponseDto {
    return {
      ...this.toResponse(webhook),

      secret,
    };
  }

  toDeliveryResponse(
    delivery: WebhookDelivery,
  ): WebhookDeliveryResponseDto {
    return {
      id:
        delivery.id,

      webhookEndpointId:
        delivery.webhookEndpointId,

      messageId:
        delivery.messageId,

      attemptNumber:
        delivery.attemptNumber,

      responseCode:
        delivery.responseCode,

      responseBody:
        delivery.responseBody,

      attemptedAt:
        delivery.attemptedAt,
    };
  }

  toDeliveryResponses(
    deliveries:
      readonly WebhookDelivery[],
  ): WebhookDeliveryResponseDto[] {
    return deliveries.map(
      (delivery) =>
        this.toDeliveryResponse(
          delivery,
        ),
    );
  }
}