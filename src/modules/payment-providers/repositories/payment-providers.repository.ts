import { Inject, Injectable } from "@nestjs/common";
import {
  PaymentProvider,
  PaymentProviderStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { Page } from "../../../common/query/page.interface.js";
import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";

@Injectable()
export class PaymentProvidersRepository
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
    return new PaymentProvidersRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.PaymentProviderCreateInput,
  ): Promise<PaymentProvider> {
    return this.execute(
      "INSERT",
      "payment_providers",
      async () => ({
        result:
          await this.db.paymentProvider.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  findById(
    id: string,
  ): Promise<PaymentProvider | null> {
    return this.execute(
      "SELECT",
      "payment_providers",
      async () => {
        const provider =
          await this.db.paymentProvider.findUnique({
            where: {
              id,
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

  findByCode(
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
          });

        return {
          result: provider,
          rowsAffected:
            provider ? 1 : 0,
        };
      },
    );
  }

  async findManyPlatform(
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly status?: PaymentProviderStatus;
      readonly search?: string;
      readonly orderBy?: Prisma.PaymentProviderOrderByWithRelationInput[];
    },
  ): Promise<Page<PaymentProvider>> {
    return this.execute(
      "SELECT",
      "payment_providers",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where: Prisma.PaymentProviderWhereInput = {
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
          this.db.paymentProvider.findMany({
            where,
            orderBy:
              options.orderBy ?? {
                createdAt: "desc",
              },
            take: options.pageSize,
            skip,
          }),

          this.db.paymentProvider.count({
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
    data: Prisma.PaymentProviderUpdateInput,
  ): Promise<PaymentProvider> {
    return this.execute(
      "UPDATE",
      "payment_providers",
      async () => ({
        result:
          await this.db.paymentProvider.update({
            where: {
              id,
            },
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  countActiveProviderServices(
    providerId: string,
  ): Promise<number> {
    return this.execute(
      "SELECT",
      "provider_services",
      async () => {
        const count =
          await this.db.providerService.count({
            where: {
              providerId,
              active: true,
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