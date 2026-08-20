import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  OutboxEventStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class OutboxEventRepository
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
    return new OutboxEventRepository(
      db,
    ) as this;
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(
    data: Prisma.OutboxEventCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "outbox_events",
      async () => {
        const result =
          await this.db.outboxEvent.create({
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
      "outbox_events",
      async () => {
        const result =
          await this.db.outboxEvent.findUnique({
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

  async findPending(
    limit: number,
  ) {
    return this.execute(
      "SELECT",
      "outbox_events",
      async () => {
        const result =
          await this.db.outboxEvent.findMany({
            where: {
              status:
                OutboxEventStatus.PENDING,

              availableAt: {
                lte: new Date(),
              },
            },

            orderBy: [
              {
                createdAt: "asc",
              },
              {
                id: "asc",
              },
            ],

            take: limit,
          });

        return {
          result,
          rowsAffected: result.length,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Processing
  // -------------------------------------------------------------------------

  async markPublished(
    id: string,
  ) {
    return this.execute(
      "UPDATE",
      "outbox_events",
      async () => {
        const result =
          await this.db.outboxEvent.update({
            where: {
              id,
            },

            data: {
              status:
                OutboxEventStatus.PUBLISHED,

              publishedAt:
                new Date(),

              lastError:
                null,
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  async markFailed(
    id: string,
    error: string,
    availableAt: Date,
  ) {
    return this.execute(
      "UPDATE",
      "outbox_events",
      async () => {
        const result =
          await this.db.outboxEvent.update({
            where: {
              id,
            },

            data: {
              status:
                OutboxEventStatus.FAILED,

              attempts: {
                increment: 1,
              },

              lastError:
                error,

              availableAt,
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  async markRetry(
    id: string,
    error: string,
    availableAt: Date,
  ) {
    return this.execute(
      "UPDATE",
      "outbox_events",
      async () => {
        const result =
          await this.db.outboxEvent.update({
            where: {
              id,
            },

            data: {
              status:
                OutboxEventStatus.PENDING,

              attempts: {
                increment: 1,
              },

              lastError:
                error,

              availableAt,
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  async claimPending(
    limit: number,
    now: Date = new Date(),
  ) {
    return this.execute(
      "UPDATE",
      "outbox_events",
      async () => {
        const events =
          await this.db.outboxEvent.findMany({
            where: {
              status:
                OutboxEventStatus.PENDING,

              availableAt: {
                lte: now,
              },
            },

            orderBy: [
              {
                createdAt: "asc",
              },
              {
                id: "asc",
              },
            ],

            take: limit,
          });

        const claimedIds: string[] = [];

        for (const event of events) {
          const result =
            await this.db.outboxEvent.updateMany({
              where: {
                id: event.id,

                status:
                  OutboxEventStatus.PENDING,
              },

              data: {
                status:
                  OutboxEventStatus.PROCESSING,

                processingAt: now,
              },
            });

          if (result.count === 1) {
            claimedIds.push(event.id);
          }
        }

        const claimed =
          claimedIds.length === 0
            ? []
            : await this.db.outboxEvent.findMany({
              where: {
                id: {
                  in: claimedIds,
                },
              },

              orderBy: [
                {
                  createdAt: "asc",
                },
                {
                  id: "asc",
                },
              ],
            });

        return {
          result: claimed,
          rowsAffected: claimed.length,
        };
      },
    );
  }

  async releaseStale(
    before: Date,
    now: Date = new Date(),
  ) {
    return this.execute(
      "UPDATE",
      "outbox_events",
      async () => {
        const result =
          await this.db.outboxEvent.updateMany({
            where: {
              status:
                OutboxEventStatus.PROCESSING,

              processingAt: {
                lt: before,
              },
            },

            data: {
              status:
                OutboxEventStatus.PENDING,

              processingAt:
                null,

              availableAt:
                now,
            },
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