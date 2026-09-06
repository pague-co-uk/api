import { Inject, Injectable } from "@nestjs/common";
import {
  ApiKey,
  ApiKeyStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import type { Page } from "../common/query/page.interface.js";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class ApiKeyRepository
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
    return new ApiKeyRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.ApiKeyCreateInput,
  ): Promise<ApiKey> {
    return this.execute(
      "INSERT",
      "api_keys",
      async () => ({
        result:
          await this.db.apiKey.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  findById(
    id: string,
  ): Promise<ApiKey | null> {
    return this.execute(
      "SELECT",
      "api_keys",
      async () => {
        const apiKey =
          await this.db.apiKey.findUnique({
            where: { id },
          });

        return {
          result: apiKey,
          rowsAffected:
            apiKey ? 1 : 0,
        };
      },
    );
  }

  findByPublicId(
    publicId: string,
  ): Promise<ApiKey | null> {
    return this.execute(
      "SELECT",
      "api_keys",
      async () => {
        const apiKey =
          await this.db.apiKey.findUnique({
            where: {
              publicId,
            },
          });

        return {
          result: apiKey,
          rowsAffected:
            apiKey ? 1 : 0,
        };
      },
    );
  }

  findBySecretHash(
    secretHash: string,
  ): Promise<ApiKey | null> {
    return this.execute(
      "SELECT",
      "api_keys",
      async () => {
        const apiKey =
          await this.db.apiKey.findFirst({
            where: {
              secretHash,
            },
          });

        return {
          result: apiKey,
          rowsAffected:
            apiKey ? 1 : 0,
        };
      },
    );
  }

  async findManyPlatform(
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly clientId?: string;
      readonly status?: ApiKeyStatus;
      readonly search?: string;
    },
  ): Promise<
    Page<
      ApiKey & {
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
      "api_keys",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where: Prisma.ApiKeyWhereInput = {
          ...(options.clientId !== undefined
            ? {
              clientId: options.clientId,
            }
            : {}),

          ...(options.status !== undefined
            ? {
              status: options.status,
            }
            : {}),

          ...(search
            ? {
              OR: [
                {
                  name: {
                    contains: search,
                  },
                },
                {
                  publicId: {
                    contains: search,
                  },
                },
                {
                  prefix: {
                    contains: search,
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
          this.db.apiKey.findMany({
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
            take: options.pageSize,
            skip,
          }),

          this.db.apiKey.count({
            where,
          }),
        ]);

        return {
          result: {
            items,
            page: options.page,
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

  async findByClient(
    clientId: string,
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly status?: ApiKeyStatus;
    },
  ): Promise<Page<ApiKey>> {
    return this.execute(
      "SELECT",
      "api_keys",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const where: Prisma.ApiKeyWhereInput = {
          clientId,
          ...(options.status !== undefined
            ? {
              status: options.status,
            }
            : {}),
        };

        const [items, totalItems] =
          await Promise.all([
            this.db.apiKey.findMany({
              where,
              orderBy: {
                createdAt: "desc",
              },
              take: options.pageSize,
              skip,
            }),

            this.db.apiKey.count({
              where,
            }),
          ]);

        return {
          result: {
            items,
            page: options.page,
            pageSize: options.pageSize,
            totalItems,
          },
          rowsAffected: items.length,
        };
      },
    );
  }
  updateLastUsed(
    id: string,
    lastUsedAt: Date,
  ): Promise<ApiKey> {
    return this.execute(
      "UPDATE",
      "api_keys",
      async () => ({
        result:
          await this.db.apiKey.update({
            where: {
              id,
            },
            data: {
              lastUsedAt,
            },
          }),
        rowsAffected: 1,
      }),
    );
  }

  revoke(
    id: string,
    revokedAt: Date,
  ): Promise<ApiKey> {
    return this.execute(
      "UPDATE",
      "api_keys",
      async () => ({
        result:
          await this.db.apiKey.update({
            where: {
              id,
            },
            data: {
              revokedAt,
              status:
                ApiKeyStatus.REVOKED,
            },
          }),
        rowsAffected: 1,
      }),
    );
  }

  async findByPrefixWithCapabilities(
    prefix: string,
  ): Promise<
    (ApiKey & {
      capabilities: Array<{
        capability: {
          name: string;
        };
      }>;
    }) | null
  > {
    return this.execute(
      "SELECT",
      "api_keys",
      async () => {
        const result =
          await this.db.apiKey.findUnique({
            where: {
              prefix,
            },
            include: {
              capabilities: {
                include: {
                  capability: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
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

  updateSecret(
    id: string,
    secretHash: string,
  ): Promise<ApiKey> {
    return this.execute(
      "UPDATE",
      "api_keys",
      async () => ({
        result:
          await this.db.apiKey.update({
            where: {
              id,
            },
            data: {
              secretHash,
            },
          }),
        rowsAffected: 1,
      }),
    );
  }

  findByPrefix(
    prefix: string,
  ): Promise<ApiKey | null> {
    return this.execute(
      "SELECT",
      "api_keys",
      async () => {
        const result =
          await this.db.apiKey.findUnique({
            where: {
              prefix,
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

  delete(
    id: string,
  ): Promise<ApiKey> {
    return this.execute(
      "DELETE",
      "api_keys",
      async () => ({
        result:
          await this.db.apiKey.delete({
            where: {
              id,
            },
          }),
        rowsAffected: 1,
      }),
    );
  }

  async deleteCapabilities(
    apiKeyId: string,
  ): Promise<void> {
    return this.execute(
      "DELETE",
      "api_key_capability_assignments",
      async () => {
        const result =
          await this.db.apiKeyCapabilityAssignment
            .deleteMany({
              where: {
                apiKeyId,
              },
            });

        return {
          result: undefined,
          rowsAffected:
            result.count,
        };
      },
    );
  }

  async createCapabilities(
    apiKeyId: string,
    capabilityIds: readonly string[],
  ): Promise<{
    count: number;
  }> {
    if (capabilityIds.length === 0) {
      return {
        count: 0,
      };
    }

    return this.execute(
      "INSERT",
      "api_key_capability_assignments",
      async () => {
        const result =
          await this.db.apiKeyCapabilityAssignment
            .createMany({
              data:
                capabilityIds.map(
                  (capabilityId) => ({
                    apiKeyId,
                    capabilityId,
                  }),
                ),
              skipDuplicates: true,
            });

        return {
          result,
          rowsAffected:
            result.count,
        };
      },
    );
  }
}