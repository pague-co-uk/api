import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  Client,
  ClientService,
  Currency,
  PaymentProvider,
  Prisma,
  PrismaClient,
  ProviderService,
  Service,
  Transaction,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

import {
  Page,
} from "../../../common/query/page.interface.js";

import {
  DATABASE,
} from "../../../database/database.constants.js";

import {
  DatabaseRepository,
} from "../../../database/database.repository.js";

export type TransactionWithRelations =
  Transaction & {
    client: Client;

    clientService:
    ClientService & {
      service: Service;
    };

    provider:
    PaymentProvider | null;

    providerService:
    | (
      ProviderService & {
        service: Service;
      }
    )
    | null;

    currency: Currency;

    transactionType: TransactionType;
  };

@Injectable()
export class TransactionsRepository
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
    return new TransactionsRepository(
      db,
    ) as this;
  }

  findById(
    id: string,
    clientId?: string,
  ): Promise<Transaction | null> {
    return this.execute(
      "SELECT",
      "transactions",
      async () => {
        const transaction =
          await this.db.transaction.findFirst({
            where: {
              id,

              ...(clientId !== undefined
                ? {
                  clientId,
                }
                : {}),
            },
          });

        return {
          result: transaction,

          rowsAffected:
            transaction ? 1 : 0,
        };
      },
    );
  }

  findByIdWithRelations(
    id: string,
    clientId?: string,
  ): Promise<
    TransactionWithRelations | null
  > {
    return this.execute(
      "SELECT",
      "transactions",
      async () => {
        const transaction =
          await this.db.transaction.findFirst({
            where: {
              id,

              ...(clientId !== undefined
                ? {
                  clientId,
                }
                : {}),
            },

            include: {
              client: true,

              clientService: {
                include: {
                  service: true,
                },
              },

              provider: true,

              providerService: {
                include: {
                  service: true,
                },
              },

              currency: true,

              transactionType: true,
            },
          });

        return {
          result: transaction,

          rowsAffected:
            transaction ? 1 : 0,
        };
      },
    );
  }

  async findManyPlatform(
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly search?: string;
      readonly status?: TransactionStatus;
      readonly clientId?: string;
      readonly clientServiceId?: string;
      readonly providerId?: string;
      readonly providerServiceId?: string;
      readonly currencyId?: string;
      readonly transactionTypeId?: string;
      readonly orderBy?: Prisma.TransactionOrderByWithRelationInput[];
    },
  ): Promise<
    Page<TransactionWithRelations>
  > {
    return this.execute(
      "SELECT",
      "transactions",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where:
          Prisma.TransactionWhereInput =
        {
          ...(options.status !== undefined
            ? {
              status:
                options.status,
            }
            : {}),

          ...(options.clientId !== undefined
            ? {
              clientId:
                options.clientId,
            }
            : {}),

          ...(options.clientServiceId !== undefined
            ? {
              clientServiceId:
                options.clientServiceId,
            }
            : {}),

          ...(options.providerId !== undefined
            ? {
              providerId:
                options.providerId,
            }
            : {}),

          ...(options.providerServiceId !== undefined
            ? {
              providerServiceId:
                options.providerServiceId,
            }
            : {}),

          ...(options.currencyId !== undefined
            ? {
              currencyId:
                options.currencyId,
            }
            : {}),

          ...(options.transactionTypeId !== undefined
            ? {
              transactionTypeId:
                options.transactionTypeId,
            }
            : {}),

          ...(search
            ? {
              OR: [
                {
                  publicId: {
                    contains:
                      search,
                  },
                },

                {
                  reference: {
                    contains:
                      search,
                  },
                },

                {
                  providerReference: {
                    contains:
                      search,
                  },
                },

                {
                  client: {
                    OR: [
                      {
                        displayName: {
                          contains:
                            search,
                        },
                      },

                      {
                        companyName: {
                          contains:
                            search,
                        },
                      },
                    ],
                  },
                },

                {
                  clientService: {
                    service: {
                      OR: [
                        {
                          code: {
                            contains:
                              search,
                          },
                        },

                        {
                          name: {
                            contains:
                              search,
                          },
                        },
                      ],
                    },
                  },
                },

                {
                  provider: {
                    OR: [
                      {
                        code: {
                          contains:
                            search,
                        },
                      },

                      {
                        name: {
                          contains:
                            search,
                        },
                      },
                    ],
                  },
                },

                {
                  providerService: {
                    service: {
                      OR: [
                        {
                          code: {
                            contains:
                              search,
                          },
                        },

                        {
                          name: {
                            contains:
                              search,
                          },
                        },
                      ],
                    },
                  },
                },

                {
                  currency: {
                    OR: [
                      {
                        code: {
                          contains:
                            search,
                        },
                      },

                      {
                        name: {
                          contains:
                            search,
                        },
                      },
                    ],
                  },
                },

                {
                  transactionType: {
                    OR: [
                      {
                        code: {
                          contains:
                            search,
                        },
                      },

                      {
                        name: {
                          contains:
                            search,
                        },
                      },
                    ],
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
          this.db.transaction.findMany({
            where,

            include: {
              client: true,

              clientService: {
                include: {
                  service: true,
                },
              },

              provider: true,

              providerService: {
                include: {
                  service: true,
                },
              },

              currency: true,

              transactionType: true,
            },

            orderBy:
              options.orderBy ?? {
                createdAt: "desc",
              },

            take:
              options.pageSize,

            skip,
          }),

          this.db.transaction.count({
            where,
          }),
        ]);

        return {
          result: {
            items,

            page:
              options.page,

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
}