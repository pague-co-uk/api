import { Injectable } from "@nestjs/common";

import type { AuthenticatedUser } from "../interfaces/index.js";

@Injectable()
export class AuthorizationService {
  private static readonly PAGUE_SUPER_USER_ROLE = "Pague Super User";

  hasPermissions(
    user: AuthenticatedUser,
    required: readonly string[],
  ): boolean {
    if (required.length === 0) {
      return true;
    }

    const granted =
      this.resolvePermissions(user);

    return required.every(
      (permission) =>
        granted.has(permission),
    );
  }

  isAuthorized(
    user: AuthenticatedUser,
    required: readonly string[],
  ): boolean {
    return this.hasPermissions(
      user,
      required,
    );
  }

  isPagueSuperUser(
    user: AuthenticatedUser,
  ): boolean {
    return user.roles.some(
      (role) =>
        role.name ===
        AuthorizationService.PAGUE_SUPER_USER_ROLE,
    );
  }

  canAccessClient(
    user: AuthenticatedUser,
    clientId: string,
  ): boolean {
    if (
      this.isPagueSuperUser(user)
    ) {
      return true;
    }

    return user.clientId === clientId;
  }

  private resolvePermissions(
    user: AuthenticatedUser,
  ): ReadonlySet<string> {
    const permissions =
      new Set<string>();

    for (const role of user.roles) {
      for (const permission of role.permissions) {
        permissions.add(
          permission.name,
        );
      }
    }

    return permissions;
  }
}