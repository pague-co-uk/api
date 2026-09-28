import { Injectable } from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { Prisma, Role } from "@prisma/client";

import { AuthenticatedUser } from "src/common/authorization/interfaces/authenticated-user.interface.js";
import { AuditService } from "../../../audit/index.js";
import type { Page } from "../../../common/query/page.interface.js";
import { PermissionsNotFoundException } from "../../../exceptions/entity/permissions.exceptions.js";
import {
  RoleAlreadyExistsException,
  RoleNotFoundException,
} from "../../../exceptions/entity/roles.exception.js";
import { PermissionRepository } from "../../../repositories/PermissionRepository.js";
import { RolePermissionRepository } from "../../../repositories/RolePermissionRepository.js";
import {
  RoleRepository,
  RoleWithPermissions,
} from "../../../repositories/RoleRepository.js";
import type { RoleQueryOptions } from "../../../repositories/options/role.options.js";
import { CreateRoleDto } from "../dto/create-role.dto.js";
import { UpdateRoleDto } from "../dto/update-role.dto.js";

const PLATFORM_SUPER_ADMIN = "PLATFORM_SUPER_ADMIN";

interface ActingRole {
  readonly name: string;
  readonly priority: number;
}


@Injectable()
export class RoleService {
  private readonly logger =
    getComponentLogger("RoleService");

  constructor(
    private readonly roles: RoleRepository,
    private readonly permissions: PermissionRepository,
    private readonly rolePermissions: RolePermissionRepository,
    private readonly audit: AuditService,
  ) { }

  private readonly rolesCreatedCounter =
    createCounterMetric({
      name: "roles.created",
      description: "Number of roles created.",
    });

  private readonly rolesUpdatedCounter =
    createCounterMetric({
      name: "roles.updated",
      description: "Number of roles updated.",
    });

  private readonly rolesDeletedCounter =
    createCounterMetric({
      name: "roles.deleted",
      description: "Number of roles deleted.",
    });

  private readonly rolePermissionsUpdatedCounter =
    createCounterMetric({
      name: "roles.permissions.updated",
      description:
        "Number of role permission assignments replaced.",
    });

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<RoleWithPermissions> {
    return withSpan(
      "RoleService.findById",
      async (span) => {
        span.setAttribute("role.id", id);

        this.logger.debug(
          {
            roleId: id,
          },
          "Retrieving role.",
        );

        try {
          const role =
            await this.roles.findByIdWithPermissions(id);

          if (!role) {
            throw new RoleNotFoundException(id);
          }

          this.assertRoleVisibleToActor(
            role,
            actor,
          );

          this.logger.debug(
            {
              roleId: role.id,
            },
            "Role retrieved successfully.",
          );

          return role;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              roleId: id,
            },
            "Failed to retrieve role.",
          );

          throw error;
        }
      },
    );
  }

  async findMany(
    query: RoleQueryOptions,
    actor: AuthenticatedUser,
  ): Promise<Page<RoleWithPermissions>> {
    return withSpan(
      "RoleService.findMany",
      async (span) => {
        this.logger.debug(
          {
            query,
          },
          "Retrieving roles.",
        );

        try {
          const maximumPriority =
            this.getActorRolePriority(actor);

          const page =
            await this.roles.findMany({
              ...query,
              maxPriority: maximumPriority,
            });

          span.setAttribute(
            "roles.count",
            page.items.length,
          );

          span.setAttribute(
            "roles.total",
            page.totalItems,
          );

          this.logger.debug(
            {
              count: page.items.length,
              total: page.totalItems,
              maxPriority: maximumPriority,
            },
            "Roles retrieved successfully.",
          );

          return page;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              query,
            },
            "Failed to retrieve roles.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async create(
    dto: CreateRoleDto,
    actor: AuthenticatedUser,
  ): Promise<RoleWithPermissions> {
    return withSpan(
      "RoleService.create",
      async (span) => {
        this.logger.info(
          {
            name: dto.name,
            priority: dto.priority,
          },
          "Creating role.",
        );

        try {
          const actorPriority =
            this.getActorRolePriority(actor);

          if (dto.priority > actorPriority) {
            throw new Error(
              "You are not authorized to create a role with a higher priority than your own.",
            );
          }

          await this.ensureNameAvailable(
            dto.name,
          );

          const role =
            await this.roles.create({
              name: dto.name,
              description:
                dto.description ?? null,
              priority: dto.priority,
            });

          this.rolesCreatedCounter.add(1);

          await this.audit.record({
            action: "role.created",
            resourceType: "Role",
            resourceId: role.id,
            metadata: {
              name: role.name,
              priority: role.priority,
            },
          });

          span.setAttribute(
            "role.id",
            role.id,
          );

          span.setAttribute(
            "role.priority",
            role.priority,
          );

          this.logger.info(
            {
              roleId: role.id,
              name: role.name,
              priority: role.priority,
            },
            "Role created successfully.",
          );

          return this.findById(
            role.id,
            actor,
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              name: dto.name,
              priority: dto.priority,
            },
            "Failed to create role.",
          );

          throw error;
        }
      },
    );
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actor: AuthenticatedUser,
  ): Promise<RoleWithPermissions> {
    return withSpan(
      "RoleService.update",
      async (span) => {
        span.setAttribute(
          "role.id",
          id,
        );

        this.logger.info(
          {
            roleId: id,
          },
          "Updating role.",
        );

        try {
          const existing =
            await this.findEntityOrThrow(id);

          this.assertRoleVisibleToActor(
            existing,
            actor,
          );

          if (
            dto.name !== undefined &&
            dto.name !== existing.name
          ) {
            await this.ensureNameAvailable(
              dto.name,
              id,
            );
          }

          const data: Prisma.RoleUpdateInput = {};

          if (dto.name !== undefined) {
            data.name = dto.name;
          }

          if (
            dto.description !== undefined
          ) {
            data.description =
              dto.description;
          }

          await this.roles.update(
            id,
            data,
          );

          this.rolesUpdatedCounter.add(1);

          await this.audit.record({
            action: "role.updated",
            resourceType: "Role",
            resourceId: id,
            metadata: {
              name:
                dto.name ??
                existing.name,
            },
          });

          this.logger.info(
            {
              roleId: id,
            },
            "Role updated successfully.",
          );

          return this.findById(
            id,
            actor,
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              roleId: id,
            },
            "Failed to update role.",
          );

          throw error;
        }
      },
    );
  }

  async delete(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    return withSpan(
      "RoleService.delete",
      async (span) => {
        span.setAttribute(
          "role.id",
          id,
        );

        this.logger.info(
          {
            roleId: id,
          },
          "Deleting role.",
        );

        try {
          const role =
            await this.findEntityOrThrow(id);

          this.assertRoleVisibleToActor(
            role,
            actor,
          );

          await this.roles.withTransaction(
            async (tx) => {
              const rolePermissions =
                this.rolePermissions.withDatabase(
                  tx,
                );

              const roles =
                this.roles.withDatabase(tx);

              await rolePermissions.deleteByRoleId(
                id,
              );

              await roles.delete(id);
            },
          );

          this.rolesDeletedCounter.add(1);

          await this.audit.record({
            action: "role.deleted",
            resourceType: "Role",
            resourceId: id,
            metadata: {
              name: role.name,
            },
          });

          this.logger.info(
            {
              roleId: id,
            },
            "Role deleted successfully.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              roleId: id,
            },
            "Failed to delete role.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Permissions
  // -------------------------------------------------------------------------

  async updatePermissions(
    roleId: string,
    permissionIds: readonly string[],
    actor: AuthenticatedUser,
  ): Promise<RoleWithPermissions> {
    return withSpan(
      "RoleService.updatePermissions",
      async (span) => {
        span.setAttribute(
          "role.id",
          roleId,
        );

        this.logger.info(
          {
            roleId,
            permissionCount:
              permissionIds.length,
          },
          "Updating role permissions.",
        );

        try {
          this.assertPlatformSuperAdmin(
            actor,
          );

          await this.findEntityOrThrow(
            roleId,
          );

          const uniquePermissionIds =
            [...new Set(permissionIds)];

          const permissions =
            await this.permissions.findByIds(
              uniquePermissionIds,
            );

          if (
            permissions.length !==
            uniquePermissionIds.length
          ) {
            const foundIds =
              new Set(
                permissions.map(
                  (permission) =>
                    permission.id,
                ),
              );

            const missingIds =
              uniquePermissionIds.filter(
                (permissionId) =>
                  !foundIds.has(
                    permissionId,
                  ),
              );

            throw new PermissionsNotFoundException(
              missingIds,
            );
          }

          await this.roles.withTransaction(
            async (tx) => {
              const rolePermissions =
                this.rolePermissions.withDatabase(
                  tx,
                );

              await rolePermissions.deleteByRoleId(
                roleId,
              );

              if (
                uniquePermissionIds.length > 0
              ) {
                await rolePermissions.createMany(
                  roleId,
                  uniquePermissionIds,
                );
              }
            },
          );

          this.rolePermissionsUpdatedCounter.add(
            1,
          );

          span.setAttribute(
            "role.permissions.count",
            uniquePermissionIds.length,
          );

          await this.audit.record({
            action:
              "role.permissions.updated",
            resourceType: "Role",
            resourceId: roleId,
            metadata: {
              permissionIds:
                uniquePermissionIds,
            },
          });

          this.logger.info(
            {
              roleId,
              permissionCount:
                uniquePermissionIds.length,
            },
            "Role permissions updated successfully.",
          );

          return this.findById(
            roleId,
            actor,
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              roleId,
            },
            "Failed to update role permissions.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Authorization
  // -------------------------------------------------------------------------

  private getActorRolePriority(
    actor: AuthenticatedUser,
  ): number {
    if (actor.roles.length === 0) {
      return -1;
    }

    return Math.max(
      ...actor.roles.map(
        (role) => role.priority,
      ),
    );
  }

  private isPlatformSuperAdmin(
    actor: AuthenticatedUser,
  ): boolean {
    return actor.roles.some(
      (role) =>
        role.name ===
        PLATFORM_SUPER_ADMIN,
    );
  }

  private assertPlatformSuperAdmin(
    actor: AuthenticatedUser,
  ): void {
    if (!this.isPlatformSuperAdmin(actor)) {
      throw new Error(
        "Only PLATFORM_SUPER_ADMIN may modify role permissions.",
      );
    }
  }

  private assertRoleVisibleToActor(
    role: Role,
    actor: AuthenticatedUser,
  ): void {
    const actorPriority =
      this.getActorRolePriority(actor);

    if (role.priority > actorPriority) {
      throw new Error(
        "You are not authorized to access this role.",
      );
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async findEntityOrThrow(
    id: string,
  ): Promise<RoleWithPermissions> {
    return withSpan(
      "RoleService.findEntityOrThrow",
      async () => {
        const role =
          await this.roles.findByIdWithPermissions(
            id,
          );

        if (!role) {
          throw new RoleNotFoundException(id);
        }

        return role;
      },
    );
  }

  private async ensureNameAvailable(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    return withSpan(
      "RoleService.ensureNameAvailable",
      async () => {
        const role =
          await this.roles.findByName(name);

        if (
          role &&
          role.id !== excludeId
        ) {
          throw new RoleAlreadyExistsException(
            name,
          );
        }
      },
    );
  }
}