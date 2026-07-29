import { Injectable } from "@nestjs/common";

import { Permission } from "@prisma/client";
import { PermissionResponseDto } from "src/modules/auth/controllers/responses/index.js";

@Injectable()
export class PermissionMapper {
  toResponse(
    permission: Permission,
  ): PermissionResponseDto {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
    };
  }

  toResponses(
    permissions: readonly Permission[],
  ): PermissionResponseDto[] {
    return permissions.map((permission) =>
      this.toResponse(permission),
    );
  }
}