import { Injectable } from "@nestjs/common";
import type { Request, Response } from "express";

import { AppConfigService } from "../../../config/config.service.js";

export interface AuthenticationCookiePayload {
  readonly sessionToken: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthenticationCookieService {
  constructor(
    private readonly config: AppConfigService,
  ) { }

  get(
    request: Request,
    name: string,
  ): string | undefined {
    const prefix = `${name}=`;

    const value = request.headers.cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) =>
        part.startsWith(prefix),
      );

    return value
      ? decodeURIComponent(
        value.slice(prefix.length),
      )
      : undefined;
  }

  setAuthenticationCookies(
    response: Response,
    authentication: AuthenticationCookiePayload,
  ): void {
    response.cookie(
      "session",
      authentication.sessionToken,
      {
        httpOnly: true,
        secure: this.config.app.isProduction,
        sameSite: "strict",
        path: "/",
      },
    );

    this.setRefreshTokenCookie(
      response,
      authentication.refreshToken,
      authentication.refreshTokenExpiresAt,
    );
  }

  setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
    expiresAt: Date,
  ): void {
    response.cookie(
      "refreshToken",
      refreshToken,
      {
        httpOnly: true,
        secure: this.config.app.isProduction,
        sameSite: "strict",
        expires: expiresAt,
        path: "/",
      },
    );
  }

  clearAuthenticationCookies(
    response: Response,
  ): void {
    const options = {
      httpOnly: true,
      secure: this.config.app.isProduction,
      sameSite: "strict" as const,
      path: "/",
    };

    response.clearCookie(
      "session",
      options,
    );

    response.clearCookie(
      "refreshToken",
      options,
    );
  }
}