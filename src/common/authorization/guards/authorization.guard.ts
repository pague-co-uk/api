import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AUTHORIZE_METADATA } from "../constants/authorization.constants.js";
import type { AuthenticatedRequest } from "../interfaces/index.js";
import { AuthorizationService } from "../services/authorization.service.js";

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
  ) { }

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<
        readonly string[]
      >(
        AUTHORIZE_METADATA,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    /*
     * No @Authorize() metadata means the endpoint
     * does not require an explicit permission.
     *
     * Authentication is still enforced by
     * AuthenticationGuard unless the endpoint is @Public().
     */
    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      return true;
    }

    const request =
      context
        .switchToHttp()
        .getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      /*
       * This should normally be impossible because
       * AuthenticationGuard runs first.
       *
       * Keep the check here as defense in depth.
       */
      throw new ForbiddenException(
        "Authenticated principal is required.",
      );
    }

    const authorized =
      this.authorization.isAuthorized(
        user,
        requiredPermissions,
      );

    if (!authorized) {
      throw new ForbiddenException(
        "You do not have permission to perform this action.",
      );
    }

    return true;
  }
}