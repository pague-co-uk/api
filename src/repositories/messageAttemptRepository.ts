import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  MessageAttemptStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class MessageAttemptRepository
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
    return new MessageAttemptRepository(
      db,
    ) as this;
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(
    data: Prisma.MessageAttemptCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "message_attempts",
      async () => {
        const result =
          await this.db.messageAttempt.create({
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
      "message_attempts",
      async () => {
        const result =
          await this.db.messageAttempt.findUnique({
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
      "message_attempts",
      async () => {
        const result =
          await this.db.messageAttempt.findMany({
            where: {
              messageId,
            },

            orderBy: {
              attemptNumber: "asc",
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
      "message_attempts",
      async () => {
        const result =
          await this.db.messageAttempt.findFirst({
            where: {
              messageId,
            },

            orderBy: {
              attemptNumber: "desc",
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

  async findByProviderMessageId(
    providerMessageId: string,
  ) {
    return this.execute(
      "SELECT",
      "message_attempts",
      async () => {
        const result =
          await this.db.messageAttempt.findFirst({
            where: {
              providerMessageId,
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

  async updateStatus(
    id: string,
    status: MessageAttemptStatus,
  ) {
    return this.execute(
      "UPDATE",
      "message_attempts",
      async () => {
        const result =
          await this.db.messageAttempt.update({
            where: {
              id,
            },

            data: {
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
  // Provider response
  // -------------------------------------------------------------------------

  async updateProviderMessageId(
    id: string,
    providerMessageId: string,
  ) {
    return this.execute(
      "UPDATE",
      "message_attempts",
      async () => {
        const result =
          await this.db.messageAttempt.update({
            where: {
              id,
            },

            data: {
              providerMessageId,
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
  // Completion
  // -------------------------------------------------------------------------

  async complete(
    id: string,
    data: {
      readonly status: MessageAttemptStatus;
      readonly completedAt: Date;
      readonly errorCode?: string | null;
      readonly errorMessage?: string | null;
    },
  ) {
    return this.execute(
      "UPDATE",
      "message_attempts",
      async () => {
        const result =
          await this.db.messageAttempt.update({
            where: {
              id,
            },

            data: {
              status:
                data.status,

              completedAt:
                data.completedAt,

              errorCode:
                data.errorCode,

              errorMessage:
                data.errorMessage,
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