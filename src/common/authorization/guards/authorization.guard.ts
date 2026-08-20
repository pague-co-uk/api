import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthenticationMethod } from "@prisma/client";

import { AUTHORIZE_METADATA } from "../constants/authorization.constants.js";
import type { AuthenticatedRequest } from "../interfaces/index.js";
import { AuthorizationService } from "../services/authorization.service.js";

@Injectable()
export class AuthorizationGuard
  implements CanActivate {

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

    if (
      request.auth.method ===
      AuthenticationMethod.SESSION
    ) {
      const user =
        request.user;

      if (!user) {
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

    if (
      request.auth.method ===
      AuthenticationMethod.API_KEY
    ) {
      const apiKey =
        request.auth.apiKey;

      if (!apiKey) {
        throw new ForbiddenException(
          "Authenticated API key is required.",
        );
      }

      const authorized =
        this.authorization.hasCapabilities(
          apiKey,
          requiredPermissions,
        );

      if (!authorized) {
        throw new ForbiddenException(
          "API key does not have the required capability.",
        );
      }

      return true;
    }

    throw new ForbiddenException(
      "Unsupported authentication method.",
    );
  }
}