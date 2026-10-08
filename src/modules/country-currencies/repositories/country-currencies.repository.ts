import { Inject, Injectable } from "@nestjs/common";
import {
  Country,
  CountryCurrency,
  Currency,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { Page } from "../../../common/query/page.interface.js";
import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";

export type CountryCurrencyWithRelations =
  CountryCurrency & {
    country: Country;
    currency: Currency;
  };

@Injectable()
export class CountryCurrenciesRepository
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
    return new CountryCurrenciesRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.CountryCurrencyCreateInput,
  ): Promise<CountryCurrency> {
    return this.execute(
      "INSERT",
      "country_currencies",
      async () => ({
        result:
          await this.db.countryCurrency.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  async findByCountryAndCurrency(
    countryCode: string,
    currencyId: string,
  ): Promise<CountryCurrency | null> {
    return this.execute(
      "SELECT",
      "country_currencies",
      async () => {
        const country =
          await this.db.country.findUnique({
            where: {
              code: countryCode,
            },
            select: {
              id: true,
            },
          });

        if (!country) {
          return {
            result: null,
            rowsAffected: 0,
          };
        }

        const countryCurrency =
          await this.db.countryCurrency.findUnique({
            where: {
              countryId_currencyId: {
                countryId: country.id,
                currencyId,
              },
            },
          });

        return {
          result: countryCurrency,
          rowsAffected:
            countryCurrency ? 1 : 0,
        };
      },
    );
  }

  async findByCountryAndCurrencyWithRelations(
    countryCode: string,
    currencyId: string,
  ): Promise<CountryCurrencyWithRelations | null> {
    return this.execute(
      "SELECT",
      "country_currencies",
      async () => {
        const country =
          await this.db.country.findUnique({
            where: {
              code: countryCode,
            },
            select: {
              id: true,
            },
          });

        if (!country) {
          return {
            result: null,
            rowsAffected: 0,
          };
        }

        const countryCurrency =
          await this.db.countryCurrency.findUnique({
            where: {
              countryId_currencyId: {
                countryId: country.id,
                currencyId,
              },
            },
            include: {
              country: true,
              currency: true,
            },
          });

        return {
          result: countryCurrency,
          rowsAffected:
            countryCurrency ? 1 : 0,
        };
      },
    );
  }

  async findManyPlatform(
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly countryCode?: string;
      readonly currencyId?: string;
      readonly isPrimary?: boolean;
      readonly isOfficial?: boolean;
      readonly search?: string;
      readonly orderBy?: Prisma.CountryCurrencyOrderByWithRelationInput[];
    },
  ): Promise<
    Page<CountryCurrencyWithRelations>
  > {
    return this.execute(
      "SELECT",
      "country_currencies",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where: Prisma.CountryCurrencyWhereInput =
        {
          ...(options.countryCode
            ? {
              country: {
                code: options.countryCode,
              },
            }
            : {}),

          ...(options.currencyId
            ? {
              currencyId:
                options.currencyId,
            }
            : {}),

          ...(options.isPrimary !==
            undefined
            ? {
              isPrimary:
                options.isPrimary,
            }
            : {}),

          ...(options.isOfficial !==
            undefined
            ? {
              isOfficial:
                options.isOfficial,
            }
            : {}),

          ...(search
            ? {
              OR: [
                {
                  country: {
                    name: {
                      contains:
                        search,
                    },
                  },
                },
                {
                  country: {
                    code: {
                      contains:
                        search,
                    },
                  },
                },
                {
                  currency: {
                    code: {
                      contains:
                        search,
                    },
                  },
                },
                {
                  currency: {
                    name: {
                      contains:
                        search,
                    },
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
          this.db.countryCurrency.findMany({
            where,
            include: {
              country: true,
              currency: true,
            },
            orderBy:
              options.orderBy ?? {
                createdAt: "desc",
              },
            take: options.pageSize,
            skip,
          }),

          this.db.countryCurrency.count({
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

  async findPrimaryByCountry(
    countryCode: string,
  ): Promise<CountryCurrency | null> {
    return this.execute(
      "SELECT",
      "country_currencies",
      async () => {
        const country =
          await this.db.country.findUnique({
            where: {
              code: countryCode,
            },
            select: {
              id: true,
            },
          });

        if (!country) {
          return {
            result: null,
            rowsAffected: 0,
          };
        }

        const countryCurrency =
          await this.db.countryCurrency.findFirst({
            where: {
              countryId: country.id,
              isPrimary: true,
            },
          });

        return {
          result: countryCurrency,
          rowsAffected:
            countryCurrency ? 1 : 0,
        };
      },
    );
  }

  async update(
    countryCode: string,
    currencyId: string,
    data: Prisma.CountryCurrencyUpdateInput,
  ): Promise<CountryCurrency> {
    return this.execute(
      "UPDATE",
      "country_currencies",
      async () => {
        const country =
          await this.db.country.findUnique({
            where: {
              code: countryCode,
            },
            select: {
              id: true,
            },
          });

        if (!country) {
          throw new Error(
            `Country with code "${countryCode}" was not found.`,
          );
        }

        return {
          result:
            await this.db.countryCurrency.update({
              where: {
                countryId_currencyId: {
                  countryId: country.id,
                  currencyId,
                },
              },
              data,
            }),
          rowsAffected: 1,
        };
      },
    );
  }

  async delete(
    countryCode: string,
    currencyId: string,
  ): Promise<CountryCurrency> {
    return this.execute(
      "DELETE",
      "country_currencies",
      async () => {
        const country =
          await this.db.country.findUnique({
            where: {
              code: countryCode,
            },
            select: {
              id: true,
            },
          });

        if (!country) {
          throw new Error(
            `Country with code "${countryCode}" was not found.`,
          );
        }

        return {
          result:
            await this.db.countryCurrency.delete({
              where: {
                countryId_currencyId: {
                  countryId: country.id,
                  currencyId,
                },
              },
            }),
          rowsAffected: 1,
        };
      },
    );
  }

  findCountryByCode(
    code: string,
  ): Promise<Country | null> {
    return this.execute(
      "SELECT",
      "countries",
      async () => {
        const country =
          await this.db.country.findUnique({
            where: {
              code,
            },
          });

        return {
          result: country,
          rowsAffected:
            country ? 1 : 0,
        };
      },
    );
  }

  findCurrencyById(
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
}