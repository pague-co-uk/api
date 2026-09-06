import { Inject, Injectable } from "@nestjs/common";
import {
  Prisma,
  PrismaClient,
  WebhookEndpoint,
} from "@prisma/client";

import type { Page } from "../common/query/page.interface.js";
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

  // ==========================================================================
  // Create
  // ==========================================================================

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

  // ==========================================================================
  // Queries
  // ==========================================================================

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

  // ==========================================================================
  // Platform queries
  // ==========================================================================

  async findManyPlatform(
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly clientId?: string;
      readonly enabled?: boolean;
      readonly search?: string;
    },
  ): Promise<
    Page<
      WebhookEndpoint & {
        client: {
          id: string;
          publicId: string;
          companyName: string;
          displayName: string;
        };
      }
    >
  > {
    return this.execute(
      "SELECT",
      "webhook_endpoints",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where:
          Prisma.WebhookEndpointWhereInput =
        {
          ...(options.clientId !==
            undefined
            ? {
              clientId:
                options.clientId,
            }
            : {}),

          ...(options.enabled !==
            undefined
            ? {
              enabled:
                options.enabled,
            }
            : {}),

          ...(search
            ? {
              OR: [
                {
                  name: {
                    contains:
                      search,
                  },
                },
                {
                  publicId: {
                    contains:
                      search,
                  },
                },
                {
                  url: {
                    contains:
                      search,
                  },
                },
              ],
            }
            : {}),
        };

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.webhookEndpoint.findMany({
            where,

            include: {
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },
            },

            orderBy: {
              createdAt: "desc",
            },

            take:
              options.pageSize,

            skip,
          }),

          this.db.webhookEndpoint.count({
            where,
          }),
        ]);

        return {
          result: {
            items,

            page:
              options.page,

            pageSize:
              options.pageSize,

            totalItems,
          },

          rowsAffected:
            items.length,
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
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly enabled?: boolean;
    },
  ): Promise<Page<WebhookEndpoint>> {
    return this.execute(
      "SELECT",
      "webhook_endpoints",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const where: Prisma.WebhookEndpointWhereInput =
        {
          clientId,
          ...(options.enabled !==
            undefined
            ? {
              enabled:
                options.enabled,
            }
            : {}),
        };

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.webhookEndpoint.findMany({
            where,
            orderBy: {
              createdAt: "desc",
            },
            take:
              options.pageSize,
            skip,
          }),

          this.db.webhookEndpoint.count({
            where,
          }),
        ]);

        return {
          result: {
            items,
            page:
              options.page,
            pageSize:
              options.pageSize,
            totalItems,
          },

          rowsAffected:
            items.length,
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

  // ==========================================================================
  // Deliveries
  // ==========================================================================

  async findDeliveries(
    webhookEndpointId: string,
    options: {
      readonly page: number;
      readonly pageSize: number;
    },
  ): Promise<Page<Prisma.WebhookDeliveryGetPayload<{}>>> {
    return this.execute(
      "SELECT",
      "webhook_deliveries",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.webhookDelivery.findMany({
            where: {
              webhookEndpointId,
            },

            orderBy: {
              attemptedAt: "desc",
            },

            take:
              options.pageSize,

            skip,
          }),

          this.db.webhookDelivery.count({
            where: {
              webhookEndpointId,
            },
          }),
        ]);

        return {
          result: {
            items,
            page:
              options.page,
            pageSize:
              options.pageSize,
            totalItems,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  // ==========================================================================
  // Update
  // ==========================================================================

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

  // ==========================================================================
  // Delete
  // ==========================================================================

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