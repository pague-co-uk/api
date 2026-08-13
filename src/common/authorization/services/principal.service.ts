import { Injectable } from "@nestjs/common";

import { UserNotFoundException } from "../../../exceptions/auth/user-not-found.exception.js";
import { UserRepository } from "../../../repositories/userRepository.js";

import type { AuthenticatedUser } from "../interfaces/authenticated-user.interface.js";

@Injectable()
export class PrincipalService {
  constructor(
    private readonly users: UserRepository,
  ) { }

  async load(
    userId: string,
    sessionId: string,
  ): Promise<AuthenticatedUser> {
    const user =
      await this.users.findByIdWithRoles(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    return {
      sessionId,

      userId: user.id,

      clientId: user.clientId,

      username: user.username,

      email: user.email,

      firstName: user.firstName,

      lastName: user.lastName,

      active: user.status === "ACTIVE",

      locked:
        user.lockedUntil !== null &&
        user.lockedUntil > new Date(),

      mfaEnabled: user.mfaEnabled,

      roles: user.userRoles.map(
        ({ role }) => ({
          id: role.id,
          name: role.name,
          description: role.description,

          permissions: role.permissions.map(
            ({ permission }) => ({
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