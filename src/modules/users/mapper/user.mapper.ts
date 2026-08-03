import { Injectable } from "@nestjs/common";

import {
  Prisma,
  UserStatus,
} from "@prisma/client";
import { UserResponseDto } from "../../../modules/auth/controllers/responses/user.response.dto.js";
import { RoleMapper } from "../../../modules/roles/mapper/role.mapper.js";

export type UserWithRoles =
  Prisma.UserGetPayload<{
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true;
                };
              };
            };
          };
        };
      };
    };
  }>;

@Injectable()
export class UserMapper {
  constructor(
    private readonly roleMapper: RoleMapper,
  ) { }

  toResponse(
    user: UserWithRoles,
  ): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      active: user.status === UserStatus.ACTIVE,
      locked:
        user.status === UserStatus.LOCKED ||
        (user.lockedUntil !== null &&
          user.lockedUntil > new Date()),
      mfaEnabled: user.mfaEnabled,
      roles:
        this.roleMapper.toResponses(
          user.userRoles.map(
            ({ role }) => role,
          ),
        ),
    };
  }

  toResponses(
    users: readonly UserWithRoles[],
  ): UserResponseDto[] {
    return users.map((user) =>
      this.toResponse(user),
    );
  }
}
