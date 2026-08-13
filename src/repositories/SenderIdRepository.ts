import { Inject, Injectable } from "@nestjs/common";
import {
  Prisma,
  PrismaClient,
  SenderId
} from "@prisma/client";

import type { Page } from "../common/query/page.interface.js";
import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";
import type { SenderIdQueryOptions } from "./options/sender-id.options.js";

@Injectable()
export class SenderIdRepository
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
    return new SenderIdRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.SenderIdCreateInput,
  ): Promise<SenderId> {
    return this.execute(
      "INSERT",
      "sender_ids",
      async () => ({
        result:
          await this.db.senderId.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  findDefaultByClient(
    clientId: string,
  ): Promise<SenderId | null> {
    return this.execute(
      "SELECT",
      "sender_ids",
      async () => {
        const senderId =
          await this.db.senderId.findFirst({
            where: {
              clientId,
              isDefault: true,
            },
          });

        return {
          result: senderId,
          rowsAffected: senderId ? 1 : 0,
        };
      },
    );
  }

  clearDefaultByClient(
    clientId: string,
  ): Promise<number> {
    return this.execute(
      "UPDATE",
      "sender_ids",
      async () => {
        const result =
          await this.db.senderId.updateMany({
            where: {
              clientId,
              isDefault: true,
            },
            data: {
              isDefault: false,
            },
          });

        return {
          result: result.count,
          rowsAffected: result.count,
        };
      },
    );
  }

  findById(
    id: string,
  ): Promise<SenderId | null> {
    return this.execute(
      "SELECT",
      "sender_ids",
      async () => {
        const senderId =
          await this.db.senderId.findUnique({
            where: { id },
          });

        return {
          result: senderId,
          rowsAffected: senderId ? 1 : 0,
        };
      },
    );
  }

  findByPublicId(
    publicId: string,
  ): Promise<SenderId | null> {
    return this.execute(
      "SELECT",
      "sender_ids",
      async () => {
        const senderId =
          await this.db.senderId.findUnique({
            where: { publicId },
          });

        return {
          result: senderId,
          rowsAffected: senderId ? 1 : 0,
        };
      },
    );
  }

  findByClientAndSender(
    clientId: string,
    sender: string,
  ): Promise<SenderId | null> {
    return this.execute(
      "SELECT",
      "sender_ids",
      async () => {
        const senderId =
          await this.db.senderId.findUnique({
            where: {
              clientId_sender: {
                clientId,
                sender,
              },
            },
          });

        return {
          result: senderId,
          rowsAffected: senderId ? 1 : 0,
        };
      },
    );
  }

  findMany(
    query: SenderIdQueryOptions,
  ): Promise<Page<SenderId>> {
    return this.execute(
      "SELECT",
      "sender_ids",
      async () => {
        const where:
          Prisma.SenderIdWhereInput = {};

        if (query.clientId) {
          where.clientId =
            query.clientId;
        }

        if (query.status) {
          where.status =
            query.status;
        }

        if (query.sender) {
          where.sender = {
            contains: query.sender,
          };
        }

        if (
          query.isDefault !== undefined
        ) {
          where.isDefault =
            query.isDefault;
        }

        if (query.search) {
          where.OR = [
            {
              sender: {
                contains:
                  query.search,
              },
            },
            {
              publicId: {
                contains:
                  query.search,
              },
            },
          ];
        }

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.senderId.findMany({
            where,
            skip:
              (query.page - 1) *
              query.pageSize,
            take: query.pageSize,
            orderBy: [
              {
                sender: "asc",
              },
              {
                createdAt: "desc",
              },
            ],
          }),

          this.db.senderId.count({
            where,
          }),
        ]);

        return {
          result: {
            items,
            page: query.page,
            pageSize:
              query.pageSize,
            totalItems,
          },
          rowsAffected:
            items.length,
        };
      },
    );
  }

  existsByPublicId(
    publicId: string,
  ): Promise<boolean> {
    return this.execute(
      "SELECT",
      "sender_ids",
      async () => {
        const result =
          await this.db.senderId.findUnique({
            where: {
              publicId,
            },
            select: {
              id: true,
            },
          });

        return {
          result: result !== null,
          rowsAffected:
            result ? 1 : 0,
        };
      },
    );
  }

  existsByClientAndSender(
    clientId: string,
    sender: string,
  ): Promise<boolean> {
    return this.execute(
      "SELECT",
      "sender_ids",
      async () => {
        const result =
          await this.db.senderId.findUnique({
            where: {
              clientId_sender: {
                clientId,
                sender,
              },
            },
            select: {
              id: true,
            },
          });

        return {
          result: result !== null,
          rowsAffected:
            result ? 1 : 0,
        };
      },
    );
  }

  update(
    id: string,
    data: Prisma.SenderIdUpdateInput,
  ): Promise<SenderId> {
    return this.execute(
      "UPDATE",
      "sender_ids",
      async () => ({
        result:
          await this.db.senderId.update({
            where: { id },
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  delete(
    id: string,
  ): Promise<SenderId> {
    return this.execute(
      "DELETE",
      "sender_ids",
      async () => ({
        result:
          await this.db.senderId.delete({
            where: { id },
          }),
        rowsAffected: 1,
      }),
    );
  }
}