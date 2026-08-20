import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  MessageStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class MessageRepository
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
    return new MessageRepository(
      db,
    ) as this;
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(
    data: Prisma.MessageCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "messages",
      async () => {
        const result =
          await this.db.message.create({
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
      "messages",
      async () => {
        const result =
          await this.db.message.findUnique({
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

  async findByPublicId(
    publicId: string,
  ) {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const result =
          await this.db.message.findUnique({
            where: {
              publicId,
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

  async findByClient(
    clientId: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
      readonly status?: MessageStatus;
    },
  ) {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const result =
          await this.db.message.findMany({
            where: {
              clientId,

              ...(options?.status !==
                undefined
                ? {
                  currentStatus:
                    options.status,
                }
                : {}),
            },

            orderBy: {
              submittedAt: "desc",
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

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  async updateStatus(
    id: string,
    status: MessageStatus,
  ) {
    return this.execute(
      "UPDATE",
      "messages",
      async () => {
        const result =
          await this.db.message.update({
            where: {
              id,
            },

            data: {
              currentStatus:
                status,
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Counts
  // -------------------------------------------------------------------------

  async countByClient(
    clientId: string,
    status?: MessageStatus,
  ): Promise<number> {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const result =
          await this.db.message.count({
            where: {
              clientId,

              ...(status !== undefined
                ? {
                  currentStatus:
                    status,
                }
                : {}),
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