import { Inject, Injectable } from "@nestjs/common";
import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class WebhookEndpointRepository
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
    return new WebhookEndpointRepository(
      db,
    ) as this;
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(
    data: Prisma.WebhookEndpointCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "webhook_endpoints",
      async () => {
        const result =
          await this.db.webhookEndpoint.create({
            data,
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(
    id: string,
  ) {
    return this.execute(
      "SELECT",
      "webhook_endpoints",
      async () => {
        const result =
          await this.db.webhookEndpoint.findUnique({
            where: {
              id,
            },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );
  }

  async findByPublicId(
    publicId: string,
  ) {
    return this.execute(
      "SELECT",
      "webhook_endpoints",
      async () => {
        const result =
          await this.db.webhookEndpoint.findUnique({
            where: {
              publicId,
            },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );
  }

  async findByClient(
    clientId: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
      readonly enabled?: boolean;
    },
  ) {
    return this.execute(
      "SELECT",
      "webhook_endpoints",
      async () => {
        const result =
          await this.db.webhookEndpoint.findMany({
            where: {
              clientId,

              ...(options?.enabled !==
                undefined
                ? {
                  enabled:
                    options.enabled,
                }
                : {}),
            },

            orderBy: {
              createdAt: "desc",
            },

            take:
              options?.limit,

            skip:
              options?.offset,
          });

        return {
          result,
          rowsAffected: result.length,
        };
      },
    );
  }

  async countByClient(
    clientId: string,
    enabled?: boolean,
  ) {
    return this.execute(
      "SELECT",
      "webhook_endpoints",
      async () => {
        const result =
          await this.db.webhookEndpoint.count({
            where: {
              clientId,

              ...(enabled !==
                undefined
                ? {
                  enabled,
                }
                : {}),
            },
          });

        return {
          result,
          rowsAffected: result,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  async update(
    id: string,
    data: Prisma.WebhookEndpointUpdateInput,
  ) {
    return this.execute(
      "UPDATE",
      "webhook_endpoints",
      async () => {
        const result =
          await this.db.webhookEndpoint.update({
            where: {
              id,
            },
            data,
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async delete(
    id: string,
  ) {
    return this.execute(
      "DELETE",
      "webhook_endpoints",
      async () => {
        const result =
          await this.db.webhookEndpoint.delete({
            where: {
              id,
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }
}