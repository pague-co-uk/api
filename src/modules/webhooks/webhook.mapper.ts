import {
  Injectable,
} from "@nestjs/common";

import type {
  WebhookDelivery,
  WebhookEndpoint,
} from "@prisma/client";

import {
  WebhookDeliveryResponseDto,
} from "./dto/webhook-delivery.response.dto.js";

import {
  WebhookResponseDto,
} from "./dto/webhook-response.dto.js";

import {
  WebhookSecretResponseDto,
} from "./dto/webhook-secret.response.dto.js";

// ============================================================================
// Types
// ============================================================================

export type WebhookEndpointWithClient =
  WebhookEndpoint & {
    client: {
      id: string;
      publicId: string;
      companyName: string;
      displayName: string;
    };
  };

export type WebhookEndpointWithOptionalClient =
  WebhookEndpoint & {
    client?: {
      id: string;
      publicId: string;
      companyName: string;
      displayName: string;
    };
  };

// ============================================================================
// Mapper
// ============================================================================

@Injectable()
export class WebhookMapper {

  // ==========================================================================
  // Webhook
  // ==========================================================================

  toResponse(
    webhook:
      WebhookEndpointWithOptionalClient,
  ): WebhookResponseDto {

    return {
      id:
        webhook.id,

      publicId:
        webhook.publicId,

      ...(webhook.client
        ? {
          client: {
            id:
              webhook.client.id,

            publicId:
              webhook.client.publicId,

            companyName:
              webhook.client.companyName,

            displayName:
              webhook.client.displayName,
          },
        }
        : {}),

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
    webhooks:
      readonly WebhookEndpointWithOptionalClient[],
  ): WebhookResponseDto[] {

    return webhooks.map(
      (webhook) =>
        this.toResponse(webhook),
    );
  }

  // ==========================================================================
  // Secret
  // ==========================================================================

  toSecretResponse(
    webhook: WebhookEndpoint,
    secret: string,
  ): WebhookSecretResponseDto {

    return {
      ...this.toResponse(webhook),
      secret,
    };
  }

  // ==========================================================================
  // Deliveries
  // ==========================================================================

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