import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  Request,
  Response,
} from "express";

import { AppConfigService } from "src/config/config.service.js";
import { AuthenticationService } from "../services/authentication.service.js";
import { SessionService } from "../services/session.service.js";
import { UserService } from "../services/user.service.js";
import { ChangePasswordRequestDto } from "./requests/change-password.request.dto.js";
import { LoginRequestDto } from "./requests/login.request.dto.js";

@Controller({
  path: "auth",
  version: "1",
})
export class AuthenticationController {
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly sessions: SessionService,
    private readonly users: UserService,
    private readonly config: AppConfigService
  ) { }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() request: LoginRequestDto,
    @Headers("x-client-id") clientId: string | undefined,
    @Req() httpRequest: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ sessionId: string }> {
    if (!clientId) {
      throw new BadRequestException(
        "The x-client-id header is required.",
      );
    }

    const result = await this.authentication.login(
      request.identifier,
      request.password,
      clientId,
      this.getIpAddress(httpRequest),
      this.getUserAgent(httpRequest),
      request.trustedDeviceId,
    );

    this.setAuthenticationCookies(response, result);
    return result;
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() httpRequest: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const context = await this.getAuthenticatedContext(httpRequest);
    const refreshToken = this.getCookie(httpRequest, "refreshToken");

    if (!refreshToken) {
      throw new UnauthorizedException(
        "Refresh token is required.",
      );
    }

    const result = await this.authentication.refresh(
      refreshToken,
      context.userId,
      context.clientId,
      this.getIpAddress(httpRequest),
      this.getUserAgent(httpRequest),
    );

    this.setRefreshTokenCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() httpRequest: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const context = await this.getAuthenticatedContext(httpRequest);

    await this.authentication.logout(
      context.sessionId,
      context.userId,
      context.clientId,
      this.getIpAddress(httpRequest),
      this.getUserAgent(httpRequest),
    );

    this.clearAuthenticationCookies(response);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Body() request: ChangePasswordRequestDto,
    @Req() httpRequest: Request,
  ): Promise<void> {
    if (request.newPassword !== request.confirmPassword) {
      throw new BadRequestException(
        "New password confirmation does not match.",
      );
    }

    const context = await this.getAuthenticatedContext(httpRequest);

    await this.authentication.changePassword(
      context.userId,
      request.currentPassword,
      request.newPassword,
      context.clientId,
      this.getIpAddress(httpRequest),
      this.getUserAgent(httpRequest),
    );
  }

  private async getAuthenticatedContext(
    request: Request,
  ): Promise<{
    sessionId: string;
    userId: string;
    clientId: string;
  }> {
    const sessionToken = this.getCookie(request, "session");

    if (!sessionToken) {
      throw new UnauthorizedException(
        "Session token is required.",
      );
    }

    const validation = await this.sessions.validateSession(sessionToken);

    if (!validation.valid) {
      throw new UnauthorizedException("Invalid session.");
    }

    const user = await this.users.findById(validation.session.userId);

    return {
      sessionId: validation.session.id,
      userId: validation.session.userId,
      clientId: user.clientId,
    };
  }

  private getCookie(
    request: Request,
    name: string,
  ): string | undefined {
    const prefix = `${name}=`;

    const value = request.headers.cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));

    return value
      ? decodeURIComponent(value.slice(prefix.length))
      : undefined;
  }

  private getIpAddress(request: Request): string {
    return request.ip ?? request.socket.remoteAddress ?? "";
  }

  private getUserAgent(request: Request): string {
    return request.get("user-agent") ?? "";
  }

  private setAuthenticationCookies(
    response: Response,
    authentication: {
      sessionToken: string;
      refreshToken: string;
      refreshTokenExpiresAt: Date;
    },
  ): void {
    response.cookie("session", authentication.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    this.setRefreshTokenCookie(
      response,
      authentication.refreshToken,
      authentication.refreshTokenExpiresAt,
    );
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
    expiresAt: Date,
  ): void {
    response.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: this.config.app.isProduction,
      sameSite: "strict",
      expires: expiresAt,
      path: "/",
    });
  }

  private clearAuthenticationCookies(
    response: Response,
  ): void {
    const options = {
      httpOnly: true,
      secure: this.config.app.isProduction,
      sameSite: "strict" as const,
      path: "/",
    };

    response.clearCookie("session", options);
    response.clearCookie("refreshToken", options);
  }
}
