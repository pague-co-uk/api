import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthenticationMethod } from "@prisma/client";

import { ApiKeyService } from "../../../modules/auth/services/apikey.service.js";
import { AuthenticationCookieService } from "../../../modules/auth/services/authentication-cookie.service.js";
import { SessionService } from "../../../modules/auth/services/session.service.js";
import { PUBLIC_METADATA } from "../constants/index.js";
import type {
  AuthenticatedRequest,
} from "../interfaces/index.js";
import { PrincipalService } from "../services/index.js";

@Injectable()
export class AuthenticationGuard
  implements CanActivate {

  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly principals: PrincipalService,
    private readonly cookies: AuthenticationCookieService,
    private readonly apiKeys: ApiKeyService,
  ) { }

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(
        PUBLIC_METADATA,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (isPublic) {
      return true;
    }

    const request =
      context
        .switchToHttp()
        .getRequest<AuthenticatedRequest>();

    const sessionToken =
      this.cookies.get(
        request,
        "session",
      );

    if (sessionToken) {
      return this.authenticateSession(
        request,
        sessionToken,
      );
    }

    const apiKey =
      this.extractApiKey(
        request,
      );

    if (apiKey) {
      return this.authenticateApiKey(
        request,
        apiKey,
      );
    }

    throw new UnauthorizedException(
      "Authentication required.",
    );
  }

  private async authenticateSession(
    request: AuthenticatedRequest,
    sessionToken: string,
  ): Promise<boolean> {
    const validation =
      await this.sessions.validateSession(
        sessionToken,
      );

    if (!validation.valid) {
      throw new UnauthorizedException(
        "Invalid session.",
      );
    }

    request.user =
      await this.principals.load(
        validation.session.userId,
        validation.session.id,
      );

    request.auth = {
      method:
        AuthenticationMethod.SESSION,

      ipAddress:
        request.ip!,

      userAgent:
        request.get("user-agent") ?? "",
    };

    return true;
  }

  private async authenticateApiKey(
    request: AuthenticatedRequest,
    apiKey: string,
  ): Promise<boolean> {
    const validation =
      await this.apiKeys.validate(
        apiKey,
      );

    request.auth = {
      method:
        AuthenticationMethod.API_KEY,

      ipAddress:
        request.ip!,

      userAgent:
        request.get("user-agent") ?? "",

      apiKey: {
        id:
          validation.id,

        publicId:
          validation.publicId,

        clientId:
          validation.clientId,

        name:
          validation.name,

        capabilities:
          validation.capabilities,
      },
    };

    return true;
  }

  private extractApiKey(
    request: AuthenticatedRequest,
  ): string | null {
    const authorization =
      request.get(
        "authorization",
      );

    if (!authorization) {
      return null;
    }

    const [scheme, credentials] =
      authorization.split(" ");

    if (
      scheme?.toLowerCase() !==
      "bearer"
    ) {
      return null;
    }

    if (!credentials) {
      throw new UnauthorizedException(
        "Invalid authorization header.",
      );
    }

    return credentials;
  }
}