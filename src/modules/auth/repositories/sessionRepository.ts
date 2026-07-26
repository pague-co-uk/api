import { Inject, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";
import { CreateSessionInput } from "../types/create-session-input.js";

@Injectable()
export class SessionRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db:
      | PrismaClient
      | Prisma.TransactionClient,
  ) {
    super(db);
  }

  create(data: CreateSessionInput) {
    return this.execute(
      "INSERT",
      "portal_sessions",
      async () => ({
        result: await this.db.portalSession.create({
          data: {
            user: {
              connect: {
                id: data.userId,
              },
            },
            sessionTokenHash:
              data.sessionTokenHash,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            authenticatedWithMfa:
              data.authenticatedWithMfa,
            lastActivityAt:
              data.lastActivityAt,
            expiresAt: data.expiresAt,

            ...(data.trustedDeviceId
              ? {
                trustedDevice: {
                  connect: {
                    id: data.trustedDeviceId,
                  },
                },
              }
              : {}),
          },
        }),
        rowsAffected: 1,
      }),
    );
  }

  findById(id: string) {
    return this.execute(
      "SELECT",
      "portal_sessions",
      async () => {
        const session =
          await this.db.portalSession.findUnique({
            where: {
              id,
            },
          });

        return {
          result: session,
          rowsAffected: session ? 1 : 0,
        };
      },
    );
  }

  findByTokenHash(
    sessionTokenHash: string,
  ) {
    return this.execute(
      "SELECT",
      "portal_sessions",
      async () => {
        const session =
          await this.db.portalSession.findFirst({
            where: {
              sessionTokenHash,
            },
          });

        return {
          result: session,
          rowsAffected: session ? 1 : 0,
        };
      },
    );
  }

  updateActivity(
    id: string,
    lastActivityAt: Date,
  ) {
    return this.execute(
      "UPDATE",
      "portal_sessions",
      async () => ({
        result:
          await this.db.portalSession.update({
            where: {
              id,
            },
            data: {
              lastActivityAt,
            },
          }),
        rowsAffected: 1,
      }),
    );
  }

  revoke(
    id: string,
    revokedAt: Date,
  ) {
    return this.execute(
      "UPDATE",
      "portal_sessions",
      async () => ({
        result:
          await this.db.portalSession.update({
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

  revokeAllForUser(
    userId: string,
    revokedAt: Date,
  ) {
    return this.execute(
      "UPDATE",
      "portal_sessions",
      async () => {
        const result =
          await this.db.portalSession.updateMany({
            where: {
              userId,
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

  private activeSessionWhere(
    now: Date,
  ): Prisma.PortalSessionWhereInput {
    return {
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    };
  }

  protected withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new SessionRepository(
      db,
    ) as this;
  }
}