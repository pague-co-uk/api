import { Injectable } from "@nestjs/common";
import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";
import { Prisma, Role } from "@prisma/client";

import { AuditService } from "../../../audit/index.js";
import type { Page } from "../../../common/query/page.interface.js";
import { PermissionsNotFoundException } from "../../../exceptions/entity/permissions.exceptions.js";
import { RoleAlreadyExistsException, RoleNotFoundException } from "../../../exceptions/entity/roles.exception.js";
import { PermissionRepository } from "../../../repositories/PermissionRepository.js";
import { RolePermissionRepository } from "../../../repositories/RolePermissionRepository.js";
import { RoleRepository, RoleWithPermissions } from "../../../repositories/RoleRepository.js";
import type { RoleQueryOptions } from "../../../repositories/options/role.options.js";
import { CreateRoleDto } from "../dto/create-role.dto.js";
import { UpdateRoleDto } from "../dto/update-role.dto.js";

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
  ): Promise<RoleWithPermissions> {
    return withSpan(
      "RoleService.findById",
      async (span) => {
        span.setAttribute("role.id", id);

        this.logger.debug(
          { roleId: id },
          "Retrieving role.",
        );

        try {
          const role =
            await this.roles.findByIdWithPermissions(id);

          if (!role) {
            throw new RoleNotFoundException(id);
          }

          this.logger.debug(
            { roleId: role.id },
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
  ): Promise<Page<Role>> {
    return withSpan(
      "RoleService.findMany",
      async (span) => {
        this.logger.debug(
          { query },
          "Retrieving roles.",
        );

        try {
          const page =
            await this.roles.findMany(query);

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
  ): Promise<RoleWithPermissions> {
    return withSpan(
      "RoleService.create",
      async (span) => {
        this.logger.info(
          {
            name: dto.name,
          },
          "Creating role.",
        );

        try {
          await this.ensureNameAvailable(
            dto.name,
          );

          const role =
            await this.roles.create({
              name: dto.name,
              description:
                dto.description ?? null,
            });

          this.rolesCreatedCounter.add(1);

          await this.audit.record({
            action: "role.created",
            resourceType: "Role",
            resourceId: role.id,
            metadata: {
              name: role.name,
            },
          });

          span.setAttribute(
            "role.id",
            role.id,
          );

          this.logger.info(
            {
              roleId: role.id,
              name: role.name,
            },
            "Role created successfully.",
          );

          return this.findById(role.id);
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              name: dto.name,
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

          return this.findById(id);
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

          return this.findById(roleId);
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
