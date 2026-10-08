import { Inject, Injectable } from "@nestjs/common";
import {
  Currency,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { Page } from "../../../common/query/page.interface.js";
import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";


@Injectable()
export class CurrenciesRepository
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
    return new CurrenciesRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.CurrencyCreateInput,
  ): Promise<Currency> {
    return this.execute(
      "INSERT",
      "currencies",
      async () => ({
        result:
          await this.db.currency.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  findById(
    id: string,
  ): Promise<Currency | null> {
    return this.execute(
      "SELECT",
      "currencies",
      async () => {
        const currency =
          await this.db.currency.findUnique({
            where: {
              id,
            },
          });

        return {
          result: currency,
          rowsAffected:
            currency ? 1 : 0,
        };
      },
    );
  }

  findByCode(
    code: string,
  ): Promise<Currency | null> {
    return this.execute(
      "SELECT",
      "currencies",
      async () => {
        const currency =
          await this.db.currency.findUnique({
            where: {
              code,
            },
          });

        return {
          result: currency,
          rowsAffected:
            currency ? 1 : 0,
        };
      },
    );
  }

  findByNumericCode(
    numericCode: string,
  ): Promise<Currency | null> {
    return this.execute(
      "SELECT",
      "currencies",
      async () => {
        const currency =
          await this.db.currency.findUnique({
            where: {
              numericCode,
            },
          });

        return {
          result: currency,
          rowsAffected:
            currency ? 1 : 0,
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
      readonly orderBy?: Prisma.CurrencyOrderByWithRelationInput[];
    },
  ): Promise<Page<Currency>> {
    return this.execute(
      "SELECT",
      "currencies",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where: Prisma.CurrencyWhereInput = {
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
                  numericCode: {
                    contains: search,
                  },
                },
                {
                  symbol: {
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
          this.db.currency.findMany({
            where,
            orderBy:
              options.orderBy ?? {
                createdAt: "desc",
              },
            take: options.pageSize,
            skip,
          }),

          this.db.currency.count({
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
    data: Prisma.CurrencyUpdateInput,
  ): Promise<Currency> {
    return this.execute(
      "UPDATE",
      "currencies",
      async () => ({
        result:
          await this.db.currency.update({
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