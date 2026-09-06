import { Injectable } from "@nestjs/common";

import type { RoleWithPermissions } from "../../../repositories/RoleRepository.js";
import { PermissionResponseDto } from "../dto/permission.response.dto.js";
import { RoleResponseDto } from "../dto/role.response.dto.js";

@Injectable()
export class RoleMapper {

  toResponse(
    role: RoleWithPermissions,
  ): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,

      permissions:
        role.permissions.map(
          ({ permission }): PermissionResponseDto => ({
            id: permission.id,
            name: permission.name,
            description:
              permission.description,
            module: permission.module,
          }),
        ),
    };
  }

  toResponses(
    roles: readonly RoleWithPermissions[],
  ): readonly RoleResponseDto[] {
    return roles.map((role) =>
      this.toResponse(role),
    );
  }
}