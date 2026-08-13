import { Inject, Injectable } from "@nestjs/common";
import {
  Prisma,
  PrismaClient,
  Role,
} from "@prisma/client";

import type { Page } from "../common/query/page.interface.js";
import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";
import type { RoleQueryOptions } from "./options/role.options.js";

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: {
    permissions: {
      include: {
        permission: true;
      };
    };
  };
}>;

@Injectable()
export class RoleRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new RoleRepository(db) as this;
  }

  create(
    data: Prisma.RoleCreateInput,
  ): Promise<Role> {
    return this.execute(
      "INSERT",
      "roles",
      async () => ({
        result: await this.db.role.create({
          data,
        }),
        rowsAffected: 1,
      }),
    );
  }

  findById(
    id: string,
  ): Promise<Role | null> {
    return this.execute(
      "SELECT",
      "roles",
      async () => {
        const role =
          await this.db.role.findUnique({
            where: {
              id,
            },
          });

        return {
          result: role,
          rowsAffected: role ? 1 : 0,
        };
      },
    );
  }

  findByIds(
    ids: readonly string[],
  ): Promise<Role[]> {
    const uniqueIds = [...new Set(ids)];

    return this.execute(
      "SELECT",
      "roles",
      async () => {
        if (uniqueIds.length === 0) {
          return {
            result: [],
            rowsAffected: 0,
          };
        }

        const roles =
          await this.db.role.findMany({
            where: {
              id: {
                in: uniqueIds,
              },
            },
          });

        return {
          result: roles,
          rowsAffected: roles.length,
        };
      },
    );
  }

  findByIdWithPermissions(
    id: string,
  ): Promise<RoleWithPermissions | null> {
    return this.execute(
      "SELECT",
      "roles",
      async () => {
        const role =
          await this.db.role.findUnique({
            where: {
              id,
            },
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          });

        return {
          result: role,
          rowsAffected: role ? 1 : 0,
        };
      },
    );
  }

  findByName(
    name: string,
  ): Promise<Role | null> {
    return this.execute(
      "SELECT",
      "roles",
      async () => {
        const role =
          await this.db.role.findUnique({
            where: {
              name,
            },
          });

        return {
          result: role,
          rowsAffected: role ? 1 : 0,
        };
      },
    );
  }

  existsByName(
    name: string,
  ): Promise<boolean> {
    return this.execute(
      "SELECT",
      "roles",
      async () => {
        const role =
          await this.db.role.findUnique({
            where: {
              name,
            },
            select: {
              id: true,
            },
          });

        return {
          result: role !== null,
          rowsAffected: role ? 1 : 0,
        };
      },
    );
  }

  findMany(
    query: RoleQueryOptions,
  ): Promise<Page<Role>> {
    return this.execute(
      "SELECT",
      "roles",
      async () => {
        const where =
          this.buildWhereClause(query);

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.role.findMany({
            where,
            skip:
              (query.page - 1) *
              query.pageSize,
            take: query.pageSize,
            orderBy: [
              {
                name: "asc",
              },
            ],
          }),

          this.db.role.count({
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
      RoleQueryOptions,
      "search"
    > = {},
  ): Promise<number> {
    return this.execute(
      "SELECT",
      "roles",
      async () => {
        const where =
          this.buildWhereClause(query);

        const count =
          await this.db.role.count({
            where,
          });

        return {
          result: count,
          rowsAffected: count,
        };
      },
    );
  }

  update(
    id: string,
    data: Prisma.RoleUpdateInput,
  ): Promise<Role> {
    return this.execute(
      "UPDATE",
      "roles",
      async () => ({
        result:
          await this.db.role.update({
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
  ): Promise<Role> {
    return this.execute(
      "DELETE",
      "roles",
      async () => ({
        result:
          await this.db.role.delete({
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
      RoleQueryOptions,
      "search"
    >,
  ): Prisma.RoleWhereInput {
    const where: Prisma.RoleWhereInput = {};

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
          },
        },
        {
          description: {
            contains: query.search,
          },
        },
      ];
    }

    return where;
  }
}
