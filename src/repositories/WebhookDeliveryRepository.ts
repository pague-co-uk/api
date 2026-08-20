import { Inject, Injectable } from "@nestjs/common";
import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class WebhookDeliveryRepository
  extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db:
      | PrismaClient
      | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new WebhookDeliveryRepository(
      db,
    ) as this;
  }

  async findByWebhookEndpoint(
    webhookEndpointId: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
    },
  ) {
    return this.execute(
      "SELECT",
      "webhook_deliveries",
      async () => {
        const result =
          await this.db.webhookDelivery.findMany({
            where: {
              webhookEndpointId,
            },

            orderBy: {
              attemptedAt: "desc",
            },

            take:
              options?.limit,

            skip:
              options?.offset,
          });

        return {
          result,
          rowsAffected:
            result.length,
        };
      },
    );
  }

  async countByWebhookEndpoint(
    webhookEndpointId: string,
  ) {
    return this.execute(
      "SELECT",
      "webhook_deliveries",
      async () => {
        const result =
          await this.db.webhookDelivery.count({
            where: {
              webhookEndpointId,
            },
          });

        return {
          result,
          rowsAffected: result,
        };
      },
    );
  }

  async findById(
    id: string,
  ) {
    return this.execute(
      "SELECT",
      "webhook_deliveries",
      async () => {
        const result =
          await this.db.webhookDelivery.findUnique({
            where: {
              id,
            },
          });

        return {
          result,
          rowsAffected:
            result ? 1 : 0,
        };
      },
    );
  }
}