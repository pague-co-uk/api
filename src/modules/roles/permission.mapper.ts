import { Injectable } from "@nestjs/common";
import type { Permission } from "@prisma/client";

import { PermissionResponseDto } from "./dto/permission.response.dto.js";

@Injectable()
export class PermissionMapper {
  toResponse(
    permission: Permission,
  ): PermissionResponseDto {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      module: permission.module,
    };
  }

  toResponses(
    permissions: readonly Permission[],
  ): readonly PermissionResponseDto[] {
    return permissions.map(
      (permission) =>
        this.toResponse(permission),
    );
  }
}