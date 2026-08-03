import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthenticationMethod } from "@prisma/client";
import type {
  Request,
  Response,
} from "express";

import { AppConfigService } from "../../../config/config.service.js";
import { ClientIp, UserAgent } from "../../../decorators/index.js";
import { UserService } from "../../users/services/user.service.js";
import { AuthenticationService } from "../services/authentication.service.js";
import { SessionService } from "../services/session.service.js";
import { ChangePasswordRequestDto } from "./requests/change-password.request.dto.js";
import { CreateApiKeyRequestDto } from "./requests/create-api-key.request.dto.js";
import { ForgotPasswordRequestDto } from "./requests/forgot-password.request.dto.js";
import { LoginRequestDto } from "./requests/login.request.dto.js";
import { ResetPasswordRequestDto } from "./requests/reset-password.request.dto.js";
import { VerifyMfaRequestDto } from "./requests/verify-mfa.request.dto.js";

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
    @ClientIp() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<{
    requiresMfa: boolean;
    sessionId?: string;
    verificationToken?: string;
    expiresAt?: Date;
  }> {
    if (!clientId) {
      throw new BadRequestException(
        "The x-client-id header is required.",
      );
    }

    const result = await this.authentication.login(
      request.identifier,
      request.password,
      clientId,
      ipAddress,
      userAgent,
      request.trustedDeviceId,
    );

    if (result.requiresMfa) {
      return result;
    }

    this.setAuthenticationCookies(response, result);
    return {
      requiresMfa: false,
      sessionId: result.sessionId,
    };
  }

  @Post("mfa/verify")
  @HttpCode(HttpStatus.OK)
  async verifyMfa(
    @Body() request: VerifyMfaRequestDto,
    @Headers("x-client-id") clientId: string | undefined,
    @Res({ passthrough: true }) response: Response,
    @ClientIp() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<{ sessionId: string }> {
    if (!clientId) {
      throw new BadRequestException("The x-client-id header is required.");
    }

    const result = await this.authentication.verifyMfa(
      request.verificationToken,
      request.code,
      clientId,
      ipAddress,
      userAgent,
    );
    this.setAuthenticationCookies(response, result);
    return { sessionId: result.sessionId };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() httpRequest: Request,
    @Res({ passthrough: true }) response: Response,
    @ClientIp() ipAddress: string,
    @UserAgent() userAgent: string,
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
      ipAddress,
      userAgent,
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
    @ClientIp() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<void> {
    const context = await this.getAuthenticatedContext(httpRequest);

    await this.authentication.logout(
      context.sessionId,
      context.userId,
      context.clientId,
      ipAddress,
      userAgent,
    );

    this.clearAuthenticationCookies(response);
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @Req() httpRequest: Request,
    @Res({ passthrough: true }) response: Response,
    @ClientIp() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<void> {
    const context = await this.getAuthenticatedContext(httpRequest);
    await this.authentication.logoutAllSessions(
      context.userId, context.clientId, ipAddress, userAgent,
    );
    this.clearAuthenticationCookies(response);
  }

  @Get("me")
  async me(@Req() httpRequest: Request) {
    const context = await this.getAuthenticatedContext(httpRequest);
    const user = await this.users.findWithRoles(context.userId);

    return this.users.mapper().toResponse(user);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Body() request: ChangePasswordRequestDto,
    @Req() httpRequest: Request,
    @ClientIp() ipAddress: string,
    @UserAgent() userAgent: string,
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
      ipAddress,
      userAgent,
    );
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() request: ForgotPasswordRequestDto,
    @Headers("x-client-id") clientId: string | undefined,
  ): Promise<{ success: boolean; message: string }> {
    if (!clientId) {
      throw new BadRequestException("The x-client-id header is required.");
    }

    await this.authentication.forgotPassword(request.identifier, clientId);
    return {
      success: true,
      message: "If an account matches the supplied identifier, a verification code has been sent.",
    };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Body() request: ResetPasswordRequestDto,
    @Headers("x-client-id") clientId: string | undefined,
    @ClientIp() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<void> {
    if (!clientId) {
      throw new BadRequestException("The x-client-id header is required.");
    }
    if (request.password !== request.confirmPassword) {
      throw new BadRequestException("Password confirmation does not match.");
    }

    await this.authentication.resetPassword(
      request.token, request.code, request.password, clientId, ipAddress, userAgent,
    );
  }

  @Post("api-keys")
  @HttpCode(HttpStatus.CREATED)
  async createApiKey(
    @Body() request: CreateApiKeyRequestDto,
    @Req() httpRequest: Request,
    @ClientIp() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const context = await this.getAuthenticatedContext(httpRequest);
    return this.authentication.createApiKey(
      context.clientId,
      request.name,
      context.userId,
      AuthenticationMethod.SESSION,
      request.expiresAt ? new Date(request.expiresAt) : undefined,
      ipAddress,
      userAgent,
    );
  }

  @Get("api-keys")
  async listApiKeys(@Req() httpRequest: Request) {
    const context = await this.getAuthenticatedContext(httpRequest);
    const apiKeys = await this.authentication.listApiKeys(context.clientId);

    return apiKeys.map(({ secretHash, ...apiKey }) => apiKey);
  }

  @Delete("api-keys/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeApiKey(
    @Param("id") id: string,
    @Req() httpRequest: Request,
    @ClientIp() ipAddress: string,
    @UserAgent() userAgent: string,
  ): Promise<void> {
    const context = await this.getAuthenticatedContext(httpRequest);
    await this.authentication.revokeApiKeyById(
      id, context.clientId, context.userId, ipAddress, userAgent,
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
