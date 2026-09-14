import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

import { AppConfigService } from "../../../config/config.service.js";
import { AuthenticatedApiKey } from "../interfaces/authentication-contenxt.interface.js";
import type {
  AuthenticatedUser,
} from "../interfaces/index.js";


@Injectable()
export class AuthorizationService {
  private static readonly PAGUE_SUPER_USER_ROLE =
    "PLATFORM_SUPER_ADMIN";

  constructor(
    private readonly config: AppConfigService,
  ) { }

  // ==========================================================================
  // Permissions
  // ==========================================================================

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

  // ==========================================================================
  // API-key capabilities
  // ==========================================================================

  /**
   * Determines whether an API key belongs to the
   * configured platform client.
   *
   * Platform API keys have cross-client access, but
   * they must still possess the required capabilities.
   */
  isPlatformApiKey(
    apiKey: AuthenticatedApiKey,
  ): boolean {
    return (
      apiKey.clientId ===
      this.config.app.platformClient
    );
  }

  /**
   * Determines whether an API key has all of the
   * required capabilities.
   *
   * Platform API keys are not exempt from capability
   * checks. They only receive special treatment when
   * determining client access.
   */
  hasCapabilities(
    apiKey: AuthenticatedApiKey,
    required: readonly string[],
  ): boolean {
    if (required.length === 0) {
      return true;
    }

    const platformClientId =
      this.config.app.platformClient;

    const isPlatform =
      apiKey.clientId === platformClientId;

    console.log({
      apiKeyClientId: apiKey.clientId,
      platformClientId,
      isPlatform,
      capabilities: apiKey.capabilities,
      required,
    });

    const granted =
      new Set(apiKey.capabilities);

    return required.every(
      (capability) =>
        granted.has(capability),
    );
  }

  // ==========================================================================
  // Pague super-user
  // ==========================================================================

  isPagueSuperUser(
    user: AuthenticatedUser,
  ): boolean {
    return user.roles.some(
      (role) =>
        role.name ===
        AuthorizationService.PAGUE_SUPER_USER_ROLE,
    );
  }

  // ==========================================================================
  // Client access - users
  // ==========================================================================

  /**
   * Determines whether the authenticated user can
   * access the supplied client.
   *
   * Pague Super Users have cross-client access.
   * All other users are restricted to their own client.
   */
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

  // ==========================================================================
  // Client access - API keys
  // ==========================================================================

  /**
   * Determines whether the authenticated API key can
   * access the supplied client.
   *
   * Platform API keys have cross-client access.
   * Client-scoped API keys are restricted to their
   * own client.
   *
   * Capability authorization is intentionally handled
   * separately by hasCapabilities().
   */
  canAccessClientWithApiKey(
    apiKey: AuthenticatedApiKey,
    clientId: string,
  ): boolean {
    if (
      this.isPlatformApiKey(apiKey)
    ) {
      return true;
    }

    return apiKey.clientId === clientId;
  }

  /**
   * Ensures that the authenticated API key can access
   * the supplied client.
   */
  assertApiKeyClientAccess(
    apiKey: AuthenticatedApiKey,
    clientId: string,
  ): void {
    if (
      !this.canAccessClientWithApiKey(
        apiKey,
        clientId,
      )
    ) {
      throw new ForbiddenException(
        "You are not authorized to access this client.",
      );
    }
  }

  /**
   * Ensures that the authenticated user can access
   * the supplied client.
   *
   * This is useful for operations where the client
   * identifier is explicitly supplied.
   */
  assertClientAccess(
    user: AuthenticatedUser,
    clientId: string,
  ): void {
    if (
      !this.canAccessClient(
        user,
        clientId,
      )
    ) {
      throw new ForbiddenException(
        "You are not authorized to access this client.",
      );
    }
  }

  // ==========================================================================
  // Client resolution
  // ==========================================================================

  /**
   * Resolves the effective client for a client-scoped
   * resource operation.
   *
   * Rules:
   *
   * 1. Pague Super User
   *    - Must explicitly supply a client ID.
   *    - The supplied client ID becomes the resource scope.
   *
   * 2. Client-scoped user
   *    - The authenticated user's client ID is always
   *      the resource scope.
   *    - If a client ID is supplied, it must match the
   *      authenticated user's client.
   *
   * This method should be used whenever a resource belongs
   * to a client/tenant.
   */
  resolveClientId(
    user: AuthenticatedUser,
    requestedClientId?: string | null,
  ): string {
    const isSuperUser =
      this.isPagueSuperUser(user);

    // ------------------------------------------------------------------------
    // Pague Super User
    // ------------------------------------------------------------------------

    if (isSuperUser) {
      if (
        !requestedClientId?.trim()
      ) {
        throw new BadRequestException(
          "Client identifier is required.",
        );
      }

      return requestedClientId.trim();
    }

    // ------------------------------------------------------------------------
    // Client-scoped user
    // ------------------------------------------------------------------------

    if (
      requestedClientId &&
      requestedClientId.trim() !==
      user.clientId
    ) {
      throw new ForbiddenException(
        "The requested client does not match the authenticated user's client.",
      );
    }

    return user.clientId;
  }

  // ==========================================================================
  // Permissions
  // ==========================================================================

  private resolvePermissions(
    user: AuthenticatedUser,
  ): ReadonlySet<string> {
    const permissions =
      new Set<string>();

    for (
      const role of user.roles
    ) {
      for (
        const permission of
        role.permissions
      ) {
        permissions.add(
          permission.name,
        );
      }
    }

    return permissions;
  }
}