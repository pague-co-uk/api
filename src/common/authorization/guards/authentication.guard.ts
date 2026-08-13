import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthenticationMethod } from "@prisma/client";

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

    if (!sessionToken) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

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
}