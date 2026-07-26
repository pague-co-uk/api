import { Inject, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";

@Injectable()
export class RefreshTokenRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db:
      | PrismaClient
      | Prisma.TransactionClient,
  ) {
    super(db);
  }

  protected withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new RefreshTokenRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.RefreshTokenCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "refresh_tokens",
      async () => ({
        result: await this.db.refreshToken.create({
          data,
        }),
        rowsAffected: 1,
      }),
    );
  }

  findById(
    id: string,
  ) {
    return this.execute(
      "SELECT",
      "refresh_tokens",
      async () => {
        const token =
          await this.db.refreshToken.findUnique({
            where: { id },
          });

        return {
          result: token,
          rowsAffected: token ? 1 : 0,
        };
      },
    );
  }

  findByHash(
    tokenHash: string,
  ) {
    return this.execute(
      "SELECT",
      "refresh_tokens",
      async () => {
        const token =
          await this.db.refreshToken.findUnique({
            where: {
              tokenHash,
            },
          });

        return {
          result: token,
          rowsAffected: token ? 1 : 0,
        };
      },
    );
  }

  findBySession(
    sessionId: string,
  ) {
    return this.execute(
      "SELECT",
      "refresh_tokens",
      async () => {
        const tokens =
          await this.db.refreshToken.findMany({
            where: {
              sessionId,
            },
            orderBy: {
              createdAt: "desc",
            },
          });

        return {
          result: tokens,
          rowsAffected: tokens.length,
        };
      },
    );
  }

  revoke(
    id: string,
    revokedAt: Date,
  ) {
    return this.execute(
      "UPDATE",
      "refresh_tokens",
      async () => ({
        result:
          await this.db.refreshToken.update({
            where: {
              id,
            },
            data: {
              revokedAt,
            },
          }),
        rowsAffected: 1,
      }),
    );
  }

  revokeBySession(
    sessionId: string,
    revokedAt: Date,
  ) {
    return this.execute(
      "UPDATE",
      "refresh_tokens",
      async () => {
        const result =
          await this.db.refreshToken.updateMany({
            where: {
              sessionId,
              revokedAt: null,
            },
            data: {
              revokedAt,
            },
          });

        return {
          result,
          rowsAffected: result.count,
        };
      },
    );
  }

  replace(
    id: string,
    replacedById: string,
    revokedAt: Date,
  ) {
    return this.execute(
      "UPDATE",
      "refresh_tokens",
      async () => ({
        result:
          await this.db.refreshToken.update({
            where: {
              id,
            },
            data: {
              replacedById,
              revokedAt,
            },
          }),
        rowsAffected: 1,
      }),
    );
  }

  deleteExpired(
    before: Date,
  ) {
    return this.execute(
      "DELETE",
      "refresh_tokens",
      async () => {
        const result =
          await this.db.refreshToken.deleteMany({
            where: {
              expiresAt: {
                lt: before,
              },
            },
          });

        return {
          result,
          rowsAffected: result.count,
        };
      },
    );
  }
}