import { Inject, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import type { Page } from "../common/query/page.interface.js";
import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";
import type { UserWithRolesEntity } from "../modules/users/user.mapper.js";
import type {
  UserQueryOptions,
} from "./options/user.options.js";

const userWithRoles = {
  userRoles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class UserRepository extends DatabaseRepository {
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
    return new UserRepository(
      db,
    ) as this;
  }

  async findById(id: string) {
    return this.execute(
      "SELECT",
      "users",
      async () => {
        const user = await this.db.user.findUnique({
          where: { id },
        });

        return {
          result: user,
          rowsAffected: user ? 1 : 0,
        };
      },
    );
  }

  async findByIdWithRoles(
    id: string,
  ): Promise<UserWithRolesEntity | null> {
    return this.execute(
      "SELECT",
      "users",
      async () => {
        const user = await this.db.user.findUnique({
          where: { id },
          include: userWithRoles,
        });

        return {
          result: user,
          rowsAffected: user ? 1 : 0,
        };
      },
    );
  }

  async findByUsername(username: string) {
    return this.execute(
      "SELECT",
      "users",
      async () => {
        const user = await this.db.user.findUnique({
          where: { username },
        });

        return {
          result: user,
          rowsAffected: user ? 1 : 0,
        };
      },
    );
  }

  async findByEmail(
    clientId: string,
    email: string,
  ) {
    return this.execute(
      "SELECT",
      "users",
      async () => {
        const user = await this.db.user.findUnique({
          where: {
            clientId_email: {
              clientId,
              email,
            },
          },
        });

        return {
          result: user,
          rowsAffected: user ? 1 : 0,
        };
      },
    );
  }

  async recordFailedLogin(
    id: string,
    failedLoginAttempts: number,
    lockedUntil: Date | null,
  ) {
    return this.execute(
      "UPDATE",
      "users",
      async () => ({
        result: await this.db.user.update({
          where: { id },
          data: {
            failedLoginAttempts,
            lockedUntil,
          },
        }),
        rowsAffected: 1,
      }),
    );
  }

  async recordSuccessfulLogin(
    id: string,
    lastLoginAt: Date,
  ) {
    return this.execute(
      "UPDATE",
      "users",
      async () => ({
        result: await this.db.user.update({
          where: { id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt,
          },
        }),
        rowsAffected: 1,
      }),
    );
  }

  async clearLoginLock(id: string) {
    return this.execute(
      "UPDATE",
      "users",
      async () => ({
        result: await this.db.user.update({
          where: { id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        }),
        rowsAffected: 1,
      }),
    );
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<UserWithRolesEntity> {
    return this.execute(
      "UPDATE",
      "users",
      async () => ({
        result: await this.db.user.update({
          where: { id },
          data,
          include: userWithRoles,
        }),
        rowsAffected: 1,
      }),
    );
  }

  async create(
    data: Prisma.UserCreateInput,
  ): Promise<UserWithRolesEntity> {
    return this.execute(
      "INSERT",
      "users",
      async () => ({
        result: await this.db.user.create({
          data,
          include: userWithRoles,
        }),
        rowsAffected: 1,
      }),
    );
  }

  async existsByUsername(
    username: string,
  ): Promise<boolean> {
    const user =
      await this.db.user.findUnique({
        where: {
          username,
        },
        select: {
          id: true,
        },
      });

    return user !== null;
  }

  async existsByEmail(
    clientId: string,
    email: string,
  ): Promise<boolean> {
    const exists = await this.execute(
      "SELECT",
      "users",
      async () => {
        const user = await this.db.user.findUnique({
          where: {
            clientId_email: {
              clientId,
              email,
            },
          },
          select: {
            id: true,
          },
        });

        return {
          result: user !== null,
          rowsAffected: user ? 1 : 0,
        };
      },
    );

    return exists;
  }

  async findMany(
    query: UserQueryOptions,
  ): Promise<Page<UserWithRolesEntity>> {
    const where =
      this.buildWhereClause(query);

    return this.execute(
      "SELECT",
      "users",
      async () => {
        const [items, totalItems] = await Promise.all([
          this.db.user.findMany({
            where,
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
            orderBy: {
              [query.sort?.field ?? "createdAt"]:
                query.sort?.direction ?? "desc",
            },
            include: userWithRoles,
          }),
          this.db.user.count({
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

  async count(
    query: Pick<UserQueryOptions, "search" | "filters"> = {},
  ): Promise<number> {
    const where =
      this.buildWhereClause(query);

    return this.execute(
      "SELECT",
      "users",
      async () => ({
        result: await this.db.user.count({
          where,
        }),
        rowsAffected: 1,
      }),
    );
  }

  async exists(
    id: string,
  ): Promise<boolean> {
    const user = await this.execute(
      "SELECT",
      "users",
      async () => {
        const result =
          await this.db.user.findUnique({
            where: { id },
            select: { id: true },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );

    return user !== null;
  }

  async delete(
    id: string,
  ): Promise<UserWithRolesEntity> {
    return this.execute(
      "DELETE",
      "users",
      async () => ({
        result: await this.db.user.delete({
          where: { id },
          include: userWithRoles,
        }),
        rowsAffected: 1,
      }),
    );
  }

  private buildWhereClause(
    query: Pick<UserQueryOptions, "search" | "filters">,
  ): Prisma.UserWhereInput {
    return {
      ...(query.filters?.clientId && {
        clientId: query.filters.clientId,
      }),

      ...(query.filters?.status && {
        status: query.filters.status,
      }),

      ...(query.search && {
        OR: [
          {
            username: {
              contains: query.search,
            },
          },
          {
            email: {
              contains: query.search,
            },
          },
          {
            firstName: {
              contains: query.search,
            },
          },
          {
            lastName: {
              contains: query.search,
            },
          },
        ],
      }),
    };
  }
}
