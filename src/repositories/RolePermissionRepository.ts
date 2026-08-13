import { Inject, Injectable } from "@nestjs/common";
import {
  Prisma,
  PrismaClient,
  RolePermission,
} from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class RolePermissionRepository
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
    return new RolePermissionRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.RolePermissionCreateInput,
  ): Promise<RolePermission> {
    return this.execute(
      "INSERT",
      "role_permissions",
      async () => ({
        result:
          await this.db.rolePermission.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  createMany(
    roleId: string,
    permissionIds: readonly string[],
  ): Promise<Prisma.BatchPayload> {
    return this.execute(
      "INSERT",
      "role_permissions",
      async () => {
        const result =
          await this.db.rolePermission.createMany({
            data: permissionIds.map(
              (permissionId) => ({
                roleId,
                permissionId,
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

  findByRoleAndPermission(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermission | null> {
    return this.execute(
      "SELECT",
      "role_permissions",
      async () => {
        const rolePermission =
          await this.db.rolePermission.findUnique({
            where: {
              roleId_permissionId: {
                roleId,
                permissionId,
              },
            },
          });

        return {
          result: rolePermission,
          rowsAffected:
            rolePermission ? 1 : 0,
        };
      },
    );
  }

  findByRoleId(
    roleId: string,
  ): Promise<RolePermission[]> {
    return this.execute(
      "SELECT",
      "role_permissions",
      async () => {
        const rolePermissions =
          await this.db.rolePermission.findMany({
            where: {
              roleId,
            },
            orderBy: {
              permission: {
                name: "asc",
              },
            },
          });

        return {
          result: rolePermissions,
          rowsAffected:
            rolePermissions.length,
        };
      },
    );
  }

  findPermissionIdsByRoleId(
    roleId: string,
  ): Promise<string[]> {
    return this.execute(
      "SELECT",
      "role_permissions",
      async () => {
        const rolePermissions =
          await this.db.rolePermission.findMany({
            where: {
              roleId,
            },
            select: {
              permissionId: true,
            },
          });

        const permissionIds =
          rolePermissions.map(
            ({ permissionId }) =>
              permissionId,
          );

        return {
          result: permissionIds,
          rowsAffected:
            permissionIds.length,
        };
      },
    );
  }

  deleteByRoleAndPermission(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermission> {
    return this.execute(
      "DELETE",
      "role_permissions",
      async () => ({
        result:
          await this.db.rolePermission.delete({
            where: {
              roleId_permissionId: {
                roleId,
                permissionId,
              },
            },
          }),
        rowsAffected: 1,
      }),
    );
  }

  deleteByRoleId(
    roleId: string,
  ): Promise<Prisma.BatchPayload> {
    return this.execute(
      "DELETE",
      "role_permissions",
      async () => {
        const result =
          await this.db.rolePermission.deleteMany({
            where: {
              roleId,
            },
          });

        return {
          result,
          rowsAffected: result.count,
        };
      },
    );
  }
}