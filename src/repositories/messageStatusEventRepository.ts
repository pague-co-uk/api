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
export class MessageStatusEventRepository
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
    return new MessageStatusEventRepository(
      db,
    ) as this;
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(
    data: Prisma.MessageStatusEventCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "message_status_events",
      async () => {
        const result =
          await this.db.messageStatusEvent.create({
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
      "message_status_events",
      async () => {
        const result =
          await this.db.messageStatusEvent.findUnique({
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

  async findByMessage(
    messageId: string,
  ) {
    return this.execute(
      "SELECT",
      "message_status_events",
      async () => {
        const result =
          await this.db.messageStatusEvent.findMany({
            where: {
              messageId,
            },

            orderBy: {
              createdAt: "asc",
            },
          });

        return {
          result,
          rowsAffected:
            result.length,
        };
      },
    );
  }

  async findByAttempt(
    attemptId: string,
  ) {
    return this.execute(
      "SELECT",
      "message_status_events",
      async () => {
        const result =
          await this.db.messageStatusEvent.findMany({
            where: {
              attemptId,
            },

            orderBy: {
              createdAt: "asc",
            },
          });

        return {
          result,
          rowsAffected:
            result.length,
        };
      },
    );
  }

  async findLatestByMessage(
    messageId: string,
  ) {
    return this.execute(
      "SELECT",
      "message_status_events",
      async () => {
        const result =
          await this.db.messageStatusEvent.findFirst({
            where: {
              messageId,
            },

            orderBy: {
              createdAt: "desc",
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

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  async findByMessageAndStatus(
    messageId: string,
    status: MessageStatus,
  ) {
    return this.execute(
      "SELECT",
      "message_status_events",
      async () => {
        const result =
          await this.db.messageStatusEvent.findMany({
            where: {
              messageId,
              status,
            },

            orderBy: {
              createdAt: "asc",
            },
          });

        return {
          result,
          rowsAffected:
            result.length,
        };
      },
    );
  }
}