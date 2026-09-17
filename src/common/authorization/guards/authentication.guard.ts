import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthenticationMethod } from "@prisma/client";
import type { Response } from "express";

import { SessionValidationFailureReason } from "../../../modules/auth/enums/session-validation-failure-reason.enum.js";
import { ApiKeyService } from "../../../modules/auth/services/apikey.service.js";
import { AuthenticationCookieService } from "../../../modules/auth/services/authentication-cookie.service.js";
import { AuthenticationService } from "../../../modules/auth/services/authentication.service.js";
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
    private readonly authentication: AuthenticationService,
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

    const http =
      context.switchToHttp();

    const request =
      http.getRequest<AuthenticatedRequest>();

    const response =
      http.getResponse<Response>();

    const sessionToken =
      this.cookies.get(
        request,
        "session",
      );

    if (sessionToken) {
      return this.authenticateSession(
        request,
        response,
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
    response: Response,
    sessionToken: string,
  ): Promise<boolean> {
    const validation =
      await this.sessions.validateSession(
        sessionToken,
      );

    // =====================================================
    // Valid session
    // =====================================================

    if (validation.valid) {
      return this.completeSessionAuthentication(
        request,
        validation.session.id,
        validation.session.userId,
      );
    }

    // =====================================================
    // Session cannot be revived
    // =====================================================

    if (
      validation.reason !==
      SessionValidationFailureReason.EXPIRED &&
      validation.reason !==
      SessionValidationFailureReason.IDLE_TIMEOUT
    ) {
      this.cookies.clearAuthenticationCookies(
        response,
      );

      throw new UnauthorizedException(
        "Invalid session.",
      );
    }

    // =====================================================
    // Refreshable session
    // =====================================================

    const session =
      validation.session;

    if (!session) {
      this.cookies.clearAuthenticationCookies(
        response,
      );

      throw new UnauthorizedException(
        "Invalid session.",
      );
    }

    const refreshToken =
      this.cookies.get(
        request,
        "refreshToken",
      );

    if (!refreshToken) {
      this.cookies.clearAuthenticationCookies(
        response,
      );

      throw new UnauthorizedException(
        "Authentication session expired.",
      );
    }

    // =====================================================
    // Load principal
    //
    // AuthenticationService.refresh() requires the
    // authenticated user's identity and client ID.
    // =====================================================

    const principal =
      await this.principals.load(
        session.userId,
        session.id,
      );

    // =====================================================
    // Refresh SAME session + rotate refresh token
    // =====================================================

    try {
      const refreshed =
        await this.authentication.refresh(
          refreshToken,
          session.id,
          principal.userId,
          principal.clientId,
          request.ip!,
          request.get("user-agent") ?? "",
        );

      // ===================================================
      // Send rotated refresh token to browser
      // ===================================================

      this.cookies.setRefreshTokenCookie(
        response,
        refreshed.refreshToken,
        refreshed.refreshTokenExpiresAt,
      );

      // ===================================================
      // Authenticate original request
      // ===================================================

      request.user =
        principal;

      request.auth = {
        method:
          AuthenticationMethod.SESSION,

        ipAddress:
          request.ip!,

        userAgent:
          request.get("user-agent") ?? "",
      };

      return true;
    } catch {
      // AuthenticationService.refresh() already records
      // the failure. The guard converts it into an
      // authentication failure and removes stale cookies.

      this.cookies.clearAuthenticationCookies(
        response,
      );

      throw new UnauthorizedException(
        "Authentication session expired.",
      );
    }
  }

  private async completeSessionAuthentication(
    request: AuthenticatedRequest,
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    request.user =
      await this.principals.load(
        userId,
        sessionId,
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