import { Inject, Injectable } from "@nestjs/common";
import {
  PaymentProvider,
  Prisma,
  PrismaClient,
  ProviderService,
  Service,
} from "@prisma/client";
import { Page } from "../../../common/query/page.interface.js";
import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";


@Injectable()
export class ProviderServicesRepository
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
    return new ProviderServicesRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.ProviderServiceCreateInput,
  ): Promise<ProviderService> {
    return this.execute(
      "INSERT",
      "provider_services",
      async () => ({
        result:
          await this.db.providerService.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  findById(
    id: string,
  ): Promise<ProviderService | null> {
    return this.execute(
      "SELECT",
      "provider_services",
      async () => {
        const providerService =
          await this.db.providerService.findUnique({
            where: {
              id,
            },
          });

        return {
          result: providerService,
          rowsAffected:
            providerService ? 1 : 0,
        };
      },
    );
  }

  findByIdWithRelations(
    id: string,
  ): Promise<
    | (ProviderService & {
      provider: PaymentProvider;
      service: Service;
    })
    | null
  > {
    return this.execute(
      "SELECT",
      "provider_services",
      async () => {
        const providerService =
          await this.db.providerService.findUnique({
            where: {
              id,
            },
            include: {
              provider: true,
              service: true,
            },
          });

        return {
          result: providerService,
          rowsAffected:
            providerService ? 1 : 0,
        };
      },
    );
  }

  findByProviderAndService(
    providerId: string,
    serviceId: string,
  ): Promise<ProviderService | null> {
    return this.execute(
      "SELECT",
      "provider_services",
      async () => {
        const providerService =
          await this.db.providerService.findUnique({
            where: {
              providerId_serviceId: {
                providerId,
                serviceId,
              },
            },
          });

        return {
          result: providerService,
          rowsAffected:
            providerService ? 1 : 0,
        };
      },
    );
  }

  findProviderByCode(
    code: string,
  ): Promise<PaymentProvider | null> {
    return this.execute(
      "SELECT",
      "payment_providers",
      async () => {
        const provider =
          await this.db.paymentProvider.findUnique({
            where: {
              code,
            },
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              status: true,
              metadata: true,
              createdAt: true,
              updatedAt: true,
            },
          });

        return {
          result: provider,
          rowsAffected:
            provider ? 1 : 0,
        };
      },
    );
  }

  findServiceByCode(
    code: string,
  ): Promise<Service | null> {
    return this.execute(
      "SELECT",
      "services",
      async () => {
        const service =
          await this.db.service.findUnique({
            where: {
              code,
            },
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              category: true,
              status: true,
              metadata: true,
              createdAt: true,
              updatedAt: true,
            },
          });

        return {
          result: service,
          rowsAffected:
            service ? 1 : 0,
        };
      },
    );
  }

  async findManyPlatform(
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly active?: boolean;
      readonly providerCode?: string;
      readonly serviceCode?: string;
      readonly search?: string;
      readonly orderBy?: Prisma.ProviderServiceOrderByWithRelationInput[];
    },
  ): Promise<
    Page<
      ProviderService & {
        provider: PaymentProvider;
        service: Service;
      }
    >
  > {
    return this.execute(
      "SELECT",
      "provider_services",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where: Prisma.ProviderServiceWhereInput = {
          ...(options.active !== undefined
            ? {
              active:
                options.active,
            }
            : {}),

          ...(options.providerCode
            ? {
              provider: {
                code:
                  options.providerCode,
              },
            }
            : {}),

          ...(options.serviceCode
            ? {
              service: {
                code:
                  options.serviceCode,
              },
            }
            : {}),

          ...(search
            ? {
              OR: [
                {
                  externalServiceCode: {
                    contains: search,
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
              ],
            }
            : {}),
        };

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.providerService.findMany({
            where,
            include: {
              provider: true,
              service: true,
            },
            orderBy:
              options.orderBy ?? {
                createdAt: "desc",
              },
            take: options.pageSize,
            skip,
          }),

          this.db.providerService.count({
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
    data: Prisma.ProviderServiceUpdateInput,
  ): Promise<ProviderService> {
    return this.execute(
      "UPDATE",
      "provider_services",
      async () => ({
        result:
          await this.db.providerService.update({
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