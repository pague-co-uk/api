import { Inject, Injectable } from "@nestjs/common";

import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

import type { Page } from "../common/query/page.interface.js";
import { DATABASE } from "../database/database.constants.js";
import {
  DatabaseRepository,
} from "../database/database.repository.js";
import type { MobileNetworkQueryOptions } from "./options/mobile-network.options.js";

type MobileNetworkWithCountry =
  Prisma.MobileNetworkGetPayload<{
    include: {
      country: true;
    };
  }>;

@Injectable()
export class MobileNetworkRepository
  extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new MobileNetworkRepository(
      db,
    ) as this;
  }

  // =========================================================================
  // Create
  // =========================================================================

  create(
    data: Prisma.MobileNetworkCreateInput,
  ): Promise<MobileNetworkWithCountry> {
    return this.execute(
      "INSERT",
      "mobile_networks",
      async () => ({
        result:
          await this.db.mobileNetwork.create({
            data,
            include: {
              country: true,
            },
          }),

        rowsAffected: 1,
      }),
    );
  }

  // =========================================================================
  // Find
  // =========================================================================

  findById(
    id: string,
  ): Promise<MobileNetworkWithCountry | null> {
    return this.execute(
      "SELECT",
      "mobile_networks",
      async () => {
        const network =
          await this.db.mobileNetwork.findUnique({
            where: {
              id,
            },

            include: {
              country: true,
            },
          });

        return {
          result: network,
          rowsAffected:
            network ? 1 : 0,
        };
      },
    );
  }

  findByPublicId(
    publicId: string,
  ): Promise<MobileNetworkWithCountry | null> {
    return this.execute(
      "SELECT",
      "mobile_networks",
      async () => {
        const network =
          await this.db.mobileNetwork.findUnique({
            where: {
              publicId,
            },

            include: {
              country: true,
            },
          });

        return {
          result: network,
          rowsAffected:
            network ? 1 : 0,
        };
      },
    );
  }

  findByCode(
    code: string,
  ): Promise<MobileNetworkWithCountry | null> {
    return this.execute(
      "SELECT",
      "mobile_networks",
      async () => {
        const network =
          await this.db.mobileNetwork.findUnique({
            where: {
              code,
            },

            include: {
              country: true,
            },
          });

        return {
          result: network,
          rowsAffected:
            network ? 1 : 0,
        };
      },
    );
  }

  findMany(
    query: MobileNetworkQueryOptions,
  ): Promise<
    Page<MobileNetworkWithCountry>
  > {
    return this.execute(
      "SELECT",
      "mobile_networks",
      async () => {
        const where: Prisma.MobileNetworkWhereInput =
          {};

        if (query.status) {
          where.status =
            query.status;
        }

        if (query.countryCode) {
          where.country = {
            code: query.countryCode,
          };
        }

        if (query.search) {
          where.OR = [
            {
              name: {
                contains:
                  query.search,
              },
            },
            {
              code: {
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
        ] =
          await Promise.all([
            this.db.mobileNetwork.findMany(
              {
                where,

                include: {
                  country: true,
                },

                skip:
                  (query.page -
                    1) *
                  query.pageSize,

                take:
                  query.pageSize,

                orderBy: [
                  {
                    name: "asc",
                  },
                  {
                    code: "asc",
                  },
                ],
              },
            ),

            this.db.mobileNetwork.count({
              where,
            }),
          ]);

        return {
          result: {
            items,
            page:
              query.page,
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

  // =========================================================================
  // Update
  // =========================================================================

  update(
    id: string,
    data: Prisma.MobileNetworkUpdateInput,
  ): Promise<MobileNetworkWithCountry> {
    return this.execute(
      "UPDATE",
      "mobile_networks",
      async () => ({
        result:
          await this.db.mobileNetwork.update(
            {
              where: {
                id,
              },

              data,

              include: {
                country: true,
              },
            },
          ),

        rowsAffected: 1,
      }),
    );
  }

  // =========================================================================
  // Delete
  // =========================================================================

  delete(
    id: string,
  ): Promise<MobileNetworkWithCountry> {
    return this.execute(
      "DELETE",
      "mobile_networks",
      async () => ({
        result:
          await this.db.mobileNetwork.delete(
            {
              where: {
                id,
              },

              include: {
                country: true,
              },
            },
          ),

        rowsAffected: 1,
      }),
    );
  }
}