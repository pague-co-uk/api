import { Inject, Injectable } from "@nestjs/common";
import {
  Prisma,
  PrismaClient,
  TransactionType,
} from "@prisma/client";
import { Page } from "../../../common/query/page.interface.js";
import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";

@Injectable()
export class TransactionTypesRepository
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
    return new TransactionTypesRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.TransactionTypeCreateInput,
  ): Promise<TransactionType> {
    return this.execute(
      "INSERT",
      "transaction_types",
      async () => ({
        result:
          await this.db.transactionType.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  findById(
    id: string,
  ): Promise<TransactionType | null> {
    return this.execute(
      "SELECT",
      "transaction_types",
      async () => {
        const transactionType =
          await this.db.transactionType.findUnique({
            where: {
              id,
            },
          });

        return {
          result: transactionType,
          rowsAffected:
            transactionType ? 1 : 0,
        };
      },
    );
  }

  findByCode(
    code: string,
  ): Promise<TransactionType | null> {
    return this.execute(
      "SELECT",
      "transaction_types",
      async () => {
        const transactionType =
          await this.db.transactionType.findUnique({
            where: {
              code,
            },
          });

        return {
          result: transactionType,
          rowsAffected:
            transactionType ? 1 : 0,
        };
      },
    );
  }

  async findManyPlatform(
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly active?: boolean;
      readonly search?: string;
      readonly orderBy?: Prisma.TransactionTypeOrderByWithRelationInput[];
    },
  ): Promise<Page<TransactionType>> {
    return this.execute(
      "SELECT",
      "transaction_types",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where: Prisma.TransactionTypeWhereInput = {
          ...(options.active !== undefined
            ? {
              active:
                options.active,
            }
            : {}),

          ...(search
            ? {
              OR: [
                {
                  code: {
                    contains: search,
                  },
                },
                {
                  name: {
                    contains: search,
                  },
                },
                {
                  description: {
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
          this.db.transactionType.findMany({
            where,
            orderBy:
              options.orderBy ?? {
                createdAt: "desc",
              },
            take: options.pageSize,
            skip,
          }),

          this.db.transactionType.count({
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

  update(
    id: string,
    data: Prisma.TransactionTypeUpdateInput,
  ): Promise<TransactionType> {
    return this.execute(
      "UPDATE",
      "transaction_types",
      async () => ({
        result:
          await this.db.transactionType.update({
            where: {
              id,
            },
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }
}