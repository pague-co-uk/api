import { Inject, Injectable } from "@nestjs/common";
import {
  ClientService,
  ClientServiceStatus,
  Prisma,
  PrismaClient,
  Service,
} from "@prisma/client";
import { Page } from "../../../common/query/page.interface.js";
import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";

@Injectable()
export class ClientServicesRepository
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
    return new ClientServicesRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.ClientServiceCreateInput,
  ): Promise<ClientService> {
    return this.execute(
      "INSERT",
      "client_services",
      async () => ({
        result:
          await this.db.clientService.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  async findActiveCurrenciesByCodes(
    codes: string[],
  ) {
    return this.execute(
      "SELECT",
      "currencies",
      async () => {
        const currencies =
          await this.db.currency.findMany({
            where: {
              code: {
                in: codes,
              },
              active: true,
            },
            select: {
              code: true,
            },
          });

        return {
          result: currencies,
          rowsAffected: currencies.length,
        };
      },
    );
  }

  async findActiveTransactionTypesByCodes(
    codes: string[],
  ) {
    return this.execute(
      "SELECT",
      "transaction_types",
      async () => {
        const transactionTypes =
          await this.db.transactionType.findMany({
            where: {
              code: {
                in: codes,
              },
              active: true,
            },
            select: {
              code: true,
            },
          });

        return {
          result: transactionTypes,
          rowsAffected:
            transactionTypes.length,
        };
      },
    );
  }

  findById(
    id: string,
  ): Promise<ClientService | null> {
    return this.execute(
      "SELECT",
      "client_services",
      async () => {
        const clientService =
          await this.db.clientService.findUnique({
            where: {
              id,
            },
          });

        return {
          result: clientService,
          rowsAffected:
            clientService ? 1 : 0,
        };
      },
    );
  }

  findByIdWithService(
    id: string,
  ): Promise<
    | (ClientService & {
      service: Service;
    })
    | null
  > {
    return this.execute(
      "SELECT",
      "client_services",
      async () => {
        const clientService =
          await this.db.clientService.findUnique({
            where: {
              id,
            },
            include: {
              service: true,
            },
          });

        return {
          result: clientService,
          rowsAffected:
            clientService ? 1 : 0,
        };
      },
    );
  }

  findByClientAndServiceWithService(
    clientId: string,
    serviceId: string,
  ): Promise<
    | (ClientService & {
      service: Service;
    })
    | null
  > {
    return this.execute(
      "SELECT",
      "client_services",
      async () => {
        const clientService =
          await this.db.clientService.findUnique({
            where: {
              clientId_serviceId: {
                clientId,
                serviceId,
              },
            },
            include: {
              service: true,
            },
          });

        return {
          result: clientService,
          rowsAffected:
            clientService ? 1 : 0,
        };
      },
    );
  }

  findByClientAndService(
    clientId: string,
    serviceId: string,
  ): Promise<ClientService | null> {
    return this.execute(
      "SELECT",
      "client_services",
      async () => {
        const clientService =
          await this.db.clientService.findUnique({
            where: {
              clientId_serviceId: {
                clientId,
                serviceId,
              },
            },
          });

        return {
          result: clientService,
          rowsAffected:
            clientService ? 1 : 0,
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

  existsClient(
    clientId: string,
  ): Promise<boolean> {
    return this.execute(
      "SELECT",
      "clients",
      async () => {
        const client =
          await this.db.client.findUnique({
            where: {
              id: clientId,
            },
            select: {
              id: true,
            },
          });

        return {
          result: client !== null,
          rowsAffected:
            client ? 1 : 0,
        };
      },
    );
  }

  async findManyPlatform(
    options: {
      readonly clientId: string;
      readonly page: number;
      readonly pageSize: number;
      readonly status?: ClientServiceStatus;
      readonly search?: string;
      readonly orderBy?: Prisma.ClientServiceOrderByWithRelationInput[];
    },
  ): Promise<
    Page<
      ClientService & {
        service: Service;
      }
    >
  > {
    return this.execute(
      "SELECT",
      "client_services",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where: Prisma.ClientServiceWhereInput = {
          clientId:
            options.clientId,

          ...(options.status !== undefined
            ? {
              status:
                options.status,
            }
            : {}),

          ...(search
            ? {
              service: {
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
                ],
              },
            }
            : {}),
        };

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.clientService.findMany({
            where,
            include: {
              service: true,
            },
            orderBy:
              options.orderBy ?? {
                createdAt: "desc",
              },
            take: options.pageSize,
            skip,
          }),

          this.db.clientService.count({
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
    data: Prisma.ClientServiceUpdateInput,
  ): Promise<ClientService> {
    return this.execute(
      "UPDATE",
      "client_services",
      async () => ({
        result:
          await this.db.clientService.update({
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