import { Inject, Injectable } from "@nestjs/common";
import {
  Client,
  Prisma,
  PrismaClient
} from "@prisma/client";

import type { Page } from "../common/query/page.interface.js";
import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";
import type { ClientQueryOptions } from "./options/client.options.js";

@Injectable()
export class ClientRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new ClientRepository(db) as this;
  }

  create(
    data: Prisma.ClientCreateInput,
  ): Promise<Client> {
    return this.execute(
      "INSERT",
      "clients",
      async () => ({
        result:
          await this.db.client.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  findById(
    id: string,
  ): Promise<Client | null> {
    return this.execute(
      "SELECT",
      "clients",
      async () => {
        const client =
          await this.db.client.findUnique({
            where: {
              id,
            },
          });

        return {
          result: client,
          rowsAffected: client ? 1 : 0,
        };
      },
    );
  }

  findByPublicId(
    publicId: string,
  ): Promise<Client | null> {
    return this.execute(
      "SELECT",
      "clients",
      async () => {
        const client =
          await this.db.client.findUnique({
            where: {
              publicId,
            },
          });

        return {
          result: client,
          rowsAffected: client ? 1 : 0,
        };
      },
    );
  }

  findByEmail(
    email: string,
  ): Promise<Client | null> {
    return this.execute(
      "SELECT",
      "clients",
      async () => {
        const client =
          await this.db.client.findUnique({
            where: {
              email,
            },
          });

        return {
          result: client,
          rowsAffected: client ? 1 : 0,
        };
      },
    );
  }

  findMany(
    query: ClientQueryOptions,
  ): Promise<Page<Client>> {
    return this.execute(
      "SELECT",
      "clients",
      async () => {
        const where =
          this.buildWhereClause(query);

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.client.findMany({
            where,
            skip:
              (query.page - 1) *
              query.pageSize,
            take: query.pageSize,
            orderBy: [
              {
                companyName: "asc",
              },
              {
                displayName: "asc",
              },
            ],
          }),

          this.db.client.count({
            where,
          }),
        ]);

        return {
          result: {
            items,
            page: query.page,
            pageSize: query.pageSize,
            totalItems,
          },
          rowsAffected: items.length,
        };
      },
    );
  }

  count(
    query: Pick<
      ClientQueryOptions,
      "search" | "status"
    > = {},
  ): Promise<number> {
    return this.execute(
      "SELECT",
      "clients",
      async () => {
        const where =
          this.buildWhereClause(query);

        const count =
          await this.db.client.count({
            where,
          });

        return {
          result: count,
          rowsAffected: count,
        };
      },
    );
  }

  existsByPublicId(
    publicId: string,
  ): Promise<boolean> {
    return this.execute(
      "SELECT",
      "clients",
      async () => {
        const client =
          await this.db.client.findUnique({
            where: {
              publicId,
            },
            select: {
              id: true,
            },
          });

        return {
          result: client !== null,
          rowsAffected: client ? 1 : 0,
        };
      },
    );
  }

  existsByEmail(
    email: string,
  ): Promise<boolean> {
    return this.execute(
      "SELECT",
      "clients",
      async () => {
        const client =
          await this.db.client.findUnique({
            where: {
              email,
            },
            select: {
              id: true,
            },
          });

        return {
          result: client !== null,
          rowsAffected: client ? 1 : 0,
        };
      },
    );
  }

  update(
    id: string,
    data: Prisma.ClientUpdateInput,
  ): Promise<Client> {
    return this.execute(
      "UPDATE",
      "clients",
      async () => ({
        result:
          await this.db.client.update({
            where: {
              id,
            },
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  delete(
    id: string,
  ): Promise<Client> {
    return this.execute(
      "DELETE",
      "clients",
      async () => ({
        result:
          await this.db.client.delete({
            where: {
              id,
            },
          }),
        rowsAffected: 1,
      }),
    );
  }

  private buildWhereClause(
    query: Pick<
      ClientQueryOptions,
      "search" | "status"
    >,
  ): Prisma.ClientWhereInput {
    const where: Prisma.ClientWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        {
          companyName: {
            contains: query.search,
          },
        },
        {
          displayName: {
            contains: query.search,
          },
        },
        {
          email: {
            contains: query.search,
          },
        },
        {
          publicId: {
            contains: query.search,
          },
        },
      ];
    }

    return where;
  }
}