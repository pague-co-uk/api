import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";
import { RoleResponseDto } from "src/modules/auth/controllers/responses/role.response.dto.js";
import { PermissionMapper } from "src/modules/permissions/mapper/permission.mapper.js";

export type RoleWithPermissions =
  Prisma.RoleGetPayload<{
    include: {
      permissions: {
        include: {
          permission: true;
        };
      };
    };
  }>;

@Injectable()
export class RoleMapper {
  constructor(
    private readonly permissionMapper: PermissionMapper,
  ) { }

  toResponse(
    role: RoleWithPermissions,
  ): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions:
        this.permissionMapper.toResponses(
          role.permissions.map(
            ({ permission }) => permission,
          ),
        ),
    };
  }

  toResponses(
    roles: readonly RoleWithPermissions[],
  ): RoleResponseDto[] {
    return roles.map((role) =>
      this.toResponse(role),
    );
  }
}
