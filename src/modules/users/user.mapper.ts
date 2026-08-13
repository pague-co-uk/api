import { Injectable } from "@nestjs/common";
import {
  Prisma,
  UserStatus,
} from "@prisma/client";

import { RoleMapper } from "../roles/mapper/role.mapper.js";

import { UserSummaryResponseDto } from "./dto/user-summary.dto.js";
import { UserResponseDto } from "./dto/user.response.dto.js";

export type UserWithRolesEntity =
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

  toSummary(
    user: UserWithRolesEntity,
  ): UserSummaryResponseDto {
    return {
      id: user.id,
      clientId: user.clientId,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      active:
        user.status === UserStatus.ACTIVE,
      locked: this.isLocked(user),
      mfaEnabled: user.mfaEnabled,
    };
  }

  toResponse(
    user: UserWithRolesEntity,
  ): UserResponseDto {
    return {
      ...this.toSummary(user),

      roles:
        user.userRoles == null
          ? []
          : this.roleMapper.toResponses(
            user.userRoles.map(
              ({ role }) => role,
            ),
          ),
    };
  }

  toSummaries(
    users: readonly UserWithRolesEntity[],
  ): UserSummaryResponseDto[] {
    return users.map((user) =>
      this.toSummary(user),
    );
  }

  toResponses(
    users: readonly UserWithRolesEntity[],
  ): UserResponseDto[] {
    return users.map((user) =>
      this.toResponse(user),
    );
  }

  private isLocked(
    user: UserWithRolesEntity,
  ): boolean {
    return (
      user.status === UserStatus.LOCKED ||
      (
        user.lockedUntil !== null &&
        user.lockedUntil > new Date()
      )
    );
  }
}
