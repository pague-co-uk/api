import { Inject, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class UserRoleRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new UserRoleRepository(db) as this;
  }

  async findRoleIdsForUser(
    userId: string,
  ): Promise<string[]> {
    return this.execute(
      "SELECT",
      "user_roles",
      async () => {
        const assignments =
          await this.db.userRole.findMany({
            where: {
              userId,
            },
            select: {
              roleId: true,
            },
          });

        return {
          result: assignments.map(
            ({ roleId }) => roleId,
          ),
          rowsAffected: assignments.length,
        };
      },
    );
  }

  async deleteByUserId(
    userId: string,
  ) {
    return this.execute(
      "DELETE",
      "user_roles",
      async () => {
        const result =
          await this.db.userRole.deleteMany({
            where: {
              userId,
            },
          });

        return {
          result,
          rowsAffected: result.count,
        };
      },
    );
  }

  async createMany(
    userId: string,
    roleIds: readonly string[],
  ) {
    if (roleIds.length === 0) {
      return {
        count: 0,
      };
    }

    return this.execute(
      "INSERT",
      "user_roles",
      async () => {
        const result =
          await this.db.userRole.createMany({
            data: roleIds.map(
              (roleId) => ({
                userId,
                roleId,
              }),
            ),
            skipDuplicates: true,
          });

        return {
          result,
          rowsAffected: result.count,
        };
      },
    );
  }

  async replaceRoles(
    userId: string,
    roleIds: readonly string[],
  ) {
    return this.withTransaction(
      async (tx) => {
        const repository =
          this.withDatabase(tx);

        await repository.deleteByUserId(
          userId,
        );

        return repository.createMany(
          userId,
          roleIds,
        );
      },
    );
  }
}