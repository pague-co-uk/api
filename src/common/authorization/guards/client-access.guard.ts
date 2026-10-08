import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

import { AuthenticationMethod } from "@prisma/client";

import type { AuthenticatedRequest } from "../interfaces/index.js";
import { AuthorizationService } from "../services/authorization.service.js";

@Injectable()
export class ClientAccessGuard
  implements CanActivate {
  constructor(
    private readonly authorization: AuthorizationService,
  ) { }

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request =
      context
        .switchToHttp()
        .getRequest<AuthenticatedRequest>();

    const clientId =
      request.params?.clientId;

    // This is a platform-level route.
    // Client access control does not apply.
    if (clientId === undefined) {
      return true;
    }

    if (typeof clientId !== "string") {
      throw new ForbiddenException(
        "Client identifier is invalid.",
      );
    }

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

      this.authorization.assertClientAccess(
        user,
        clientId,
      );

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

      this.authorization.assertApiKeyClientAccess(
        apiKey,
        clientId,
      );

      return true;
    }

    throw new ForbiddenException(
      "Unsupported authentication method.",
    );
  }
}