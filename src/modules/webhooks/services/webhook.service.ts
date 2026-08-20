import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { WebhookDeliveryRepository } from "src/repositories/WebhookDeliveryRepository.js";
import { RandomGenerator } from "../../../common/services/random.service.js";
import { WebhookEndpointRepository } from "../../../repositories/WebhookEndpointRepository.js";

@Injectable()
export class WebhookService {
  private readonly logger =
    getComponentLogger("WebhookService");

  constructor(
    private readonly webhooks:
      WebhookEndpointRepository,
    private readonly deliveries: WebhookDeliveryRepository,
    private readonly random:
      RandomGenerator,
  ) { }

  // =========================================================================
  // Create
  // =========================================================================

  async create(
    clientId: string,
    data: {
      readonly name: string;
      readonly url: string;
    },
  ) {
    return withSpan(
      "WebhookService.create",
      async (span) => {
        const publicId =
          this.generatePublicId();

        const secret =
          this.generateSecret();

        span.setAttributes({
          "client.id":
            clientId,

          "webhook.public_id":
            publicId,

          "webhook.enabled":
            true,
        });

        try {
          const webhook =
            await this.webhooks.create({
              name:
                data.name,

              url:
                data.url,

              secret,

              enabled:
                true,

              publicId,

              client: {
                connect: {
                  id: clientId,
                },
              },
            });

          this.logger.info(
            {
              webhookId:
                webhook.id,

              publicId:
                webhook.publicId,

              clientId,

              enabled:
                webhook.enabled,
            },
            "Webhook endpoint created.",
          );

          return { webhook, secret };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              publicId,
            },
            "Failed to create webhook endpoint.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Queries
  // =========================================================================

  async findByClient(
    clientId: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
      readonly enabled?: boolean;
    },
  ) {
    return this.webhooks.findByClient(
      clientId,
      options,
    );
  }

  async countByClient(
    clientId: string,
    enabled?: boolean,
  ) {
    return this.webhooks.countByClient(
      clientId,
      enabled,
    );
  }

  async findById(
    clientId: string,
    id: string,
  ) {
    const webhook =
      await this.webhooks.findById(
        id,
      );

    return this.ensureClientOwnership(
      webhook,
      clientId,
    );
  }

  async findByPublicId(
    clientId: string,
    publicId: string,
  ) {
    const webhook =
      await this.webhooks.findByPublicId(
        publicId,
      );

    return this.ensureClientOwnership(
      webhook,
      clientId,
    );
  }

  // =========================================================================
  // Update
  // =========================================================================

  async update(
    clientId: string,
    id: string,
    data: {
      readonly name?: string;
      readonly url?: string;
    },
  ) {
    return withSpan(
      "WebhookService.update",
      async (span) => {
        span.setAttributes({
          "client.id":
            clientId,

          "webhook.id":
            id,
        });

        try {
          const webhook =
            await this.findById(
              clientId,
              id,
            );

          const updated =
            await this.webhooks.update(
              webhook.id,
              {
                ...(data.name !==
                  undefined
                  ? {
                    name:
                      data.name,
                  }
                  : {}),

                ...(data.url !==
                  undefined
                  ? {
                    url:
                      data.url,
                  }
                  : {}),
              },
            );

          this.logger.info(
            {
              webhookId:
                updated.id,

              publicId:
                updated.publicId,

              clientId,
            },
            "Webhook endpoint updated.",
          );

          return updated;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              webhookId:
                id,
            },
            "Failed to update webhook endpoint.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Enable / Disable
  // =========================================================================

  async setEnabled(
    clientId: string,
    id: string,
    enabled: boolean,
  ) {
    return withSpan(
      "WebhookService.setEnabled",
      async () => {
        try {
          const webhook =
            await this.findById(
              clientId,
              id,
            );

          if (
            webhook.enabled ===
            enabled
          ) {
            return webhook;
          }

          const updated =
            await this.webhooks.update(
              webhook.id,
              {
                enabled,
              },
            );

          this.logger.info(
            {
              webhookId:
                updated.id,

              publicId:
                updated.publicId,

              clientId,

              enabled,
            },
            enabled
              ? "Webhook endpoint enabled."
              : "Webhook endpoint disabled.",
          );

          return updated;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              webhookId:
                id,

              enabled,
            },
            "Failed to change webhook endpoint state.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Secret rotation
  // =========================================================================

  async rotateSecret(
    clientId: string,
    id: string,
  ) {
    return withSpan(
      "WebhookService.rotateSecret",
      async () => {
        try {
          const webhook =
            await this.findById(
              clientId,
              id,
            );

          const secret =
            this.generateSecret();

          const updated =
            await this.webhooks.update(
              webhook.id,
              {
                secret,
              },
            );

          this.logger.info(
            {
              webhookId:
                updated.id,

              publicId:
                updated.publicId,

              clientId,
            },
            "Webhook secret rotated.",
          );

          return { webhook: updated, secret };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              webhookId:
                id,
            },
            "Failed to rotate webhook secret.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Delete
  // =========================================================================

  async delete(
    clientId: string,
    id: string,
  ) {
    return withSpan(
      "WebhookService.delete",
      async () => {
        try {
          const webhook =
            await this.findById(
              clientId,
              id,
            );

          const result =
            await this.webhooks.delete(
              webhook.id,
            );

          this.logger.info(
            {
              webhookId:
                webhook.id,

              publicId:
                webhook.publicId,

              clientId,
            },
            "Webhook endpoint deleted.",
          );

          return result;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              webhookId:
                id,
            },
            "Failed to delete webhook endpoint.",
          );

          throw error;
        }
      },
    );
  }

  //======================================================================
  //Find Deliveries
  //======================================================================
  async findDeliveries(
    clientId: string,
    webhookEndpointId: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
    },
  ) {
    const webhook =
      await this.findById(
        clientId,
        webhookEndpointId,
      );

    return this.deliveries.findByWebhookEndpoint(
      webhook.id,
      options,
    );
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private ensureClientOwnership(
    webhook:
      Awaited<
        ReturnType<
          WebhookEndpointRepository["findById"]
        >
      >,
    clientId: string,
  ) {
    if (
      !webhook ||
      webhook.clientId !== clientId
    ) {
      throw new NotFoundException(
        "Webhook endpoint not found.",
      );
    }

    return webhook;
  }

  private generatePublicId(): string {
    return Buffer
      .from(
        this.random.bytes(10),
      )
      .toString("base64url")
      .slice(0, 20);
  }

  private generateSecret(): string {
    return Buffer
      .from(
        this.random.bytes(32),
      )
      .toString("base64url");
  }
}