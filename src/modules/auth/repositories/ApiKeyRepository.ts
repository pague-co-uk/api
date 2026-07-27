import { Inject, Injectable } from "@nestjs/common";
import { ApiKey, Prisma, PrismaClient } from "@prisma/client";

import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";

@Injectable()
export class ApiKeyRepository extends DatabaseRepository {
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
        result: await this.db.apiKey.create({
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
          rowsAffected: apiKey ? 1 : 0,
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
          rowsAffected: apiKey ? 1 : 0,
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
          rowsAffected: apiKey ? 1 : 0,
        };
      },
    );
  }

  findByClient(
    clientId: string,
  ): Promise<ApiKey[]> {
    return this.execute(
      "SELECT",
      "api_keys",
      async () => {
        const apiKeys =
          await this.db.apiKey.findMany({
            where: {
              clientId,
            },
            orderBy: {
              createdAt: "desc",
            },
          });

        return {
          result: apiKeys,
          rowsAffected: apiKeys.length,
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
              status: "REVOKED",
            },
          }),
        rowsAffected: 1,
      }),
    );
  }

  updateSecret(
    id: string,
    secretHash: string,
    rotatedAt: Date,
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
              rotatedAt,
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
}