import { Injectable } from "@nestjs/common";

import { UserResponseDto } from "../../../modules/users/dto/user.response.dto.js";
import type { AuthenticatedUser } from "../interfaces/authenticated-user.interface.js";

@Injectable()
export class PrincipalMapper {
  toResponse(
    principal: AuthenticatedUser,
  ): UserResponseDto {
    return {
      id: principal.userId,
      clientId: principal.clientId,

      firstName: principal.firstName,
      lastName: principal.lastName,

      username: principal.username,
      email: principal.email,

      active: principal.active,
      locked: principal.locked,
      mfaEnabled: principal.mfaEnabled,

      roles: principal.roles.map(
        (role) => ({
          id: role.id,
          name: role.name,
          description: role.description,

          permissions: role.permissions.map(
            (permission) => ({
              id: permission.id,
              name: permission.name,
              description: permission.description,
              module: permission.module,
            }),
          ),
        }),
      ),
    };
  }
}