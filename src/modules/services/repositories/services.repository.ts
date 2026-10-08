import { Inject, Injectable } from "@nestjs/common";
import {
  Prisma,
  PrismaClient,
  Service,
  ServiceCategory,
  ServiceStatus,
} from "@prisma/client";
import { Page } from "../../../common/query/page.interface.js";
import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";


@Injectable()
export class ServicesRepository
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
    return new ServicesRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.ServiceCreateInput,
  ): Promise<Service> {
    return this.execute(
      "INSERT",
      "services",
      async () => ({
        result:
          await this.db.service.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  findById(
    id: string,
  ): Promise<Service | null> {
    return this.execute(
      "SELECT",
      "services",
      async () => {
        const service =
          await this.db.service.findUnique({
            where: {
              id,
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

  findByCode(
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
          });

        return {
          result: service,
          rowsAffected:
            service ? 1 : 0,
        };
      },
    );
  }

  findByName(
    name: string,
  ): Promise<Service | null> {
    return this.execute(
      "SELECT",
      "services",
      async () => {
        const service =
          await this.db.service.findFirst({
            where: {
              name,
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
      readonly category?: ServiceCategory;
      readonly status?: ServiceStatus;
      readonly search?: string;
      readonly orderBy?: Prisma.ServiceOrderByWithRelationInput[];
    },
  ): Promise<Page<Service>> {
    return this.execute(
      "SELECT",
      "services",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where: Prisma.ServiceWhereInput = {
          ...(options.category !== undefined
            ? {
              category:
                options.category,
            }
            : {}),

          ...(options.status !== undefined
            ? {
              status:
                options.status,
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
          this.db.service.findMany({
            where,
            orderBy:
              options.orderBy ?? {
                createdAt: "desc",
              },
            take: options.pageSize,
            skip,
          }),

          this.db.service.count({
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
    data: Prisma.ServiceUpdateInput,
  ): Promise<Service> {
    return this.execute(
      "UPDATE",
      "services",
      async () => ({
        result:
          await this.db.service.update({
            where: {
              id,
            },
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  countActiveClientAssignments(
    serviceId: string,
  ): Promise<number> {
    return this.execute(
      "SELECT",
      "client_services",
      async () => {
        const count =
          await this.db.clientService.count({
            where: {
              serviceId,
              status: "ACTIVE",
            },
          });

        return {
          result: count,
          rowsAffected: count,
        };
      },
    );
  }
}