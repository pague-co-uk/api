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
import type {
  Request,
  Response,
} from "express";

import { CurrentUser } from "../../../common/authorization/decorators/current-user.decorator.js";
import { Public } from "../../../common/authorization/decorators/public.decorator.js";
import type { AuthenticatedUser } from "../../../common/authorization/interfaces/index.js";
import { PrincipalMapper } from "../../../common/authorization/mapper/principal.mapper.js";
import { ClientIp, UserAgent } from "../../../decorators/index.js";
import { AuthenticationCookieService } from "../services/authentication-cookie.service.js";
import { AuthenticationService } from "../services/authentication.service.js";
import { ChangePasswordRequestDto } from "./requests/change-password.request.dto.js";
import { ForgotPasswordRequestDto } from "./requests/forgot-password.request.dto.js";
import { LoginWithApiKeyRequestDto } from "./requests/index.js";
import { LoginRequestDto } from "./requests/login.request.dto.js";
import { ResetPasswordRequestDto } from "./requests/reset-password.request.dto.js";
import { VerifyMfaRequestDto } from "./requests/verify-mfa.request.dto.js";
import { UserResponseDto } from "./responses/index.js";

@Controller({
  path: "auth",
  version: "1",
})
export class AuthenticationController {
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly principalMapper: PrincipalMapper,
    private readonly authenticationCookieService: AuthenticationCookieService,
  ) { }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() request: LoginRequestDto,
    @Headers("x-client-id") clientId: string | undefined,
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

    this.authenticationCookieService.setAuthenticationCookies(response, result);
    return {
      requiresMfa: false,
      sessionId: result.sessionId,
    };
  }

  @Public()
  @Post("login/api-key")
  @HttpCode(HttpStatus.OK)
  async loginWithApiKey(
    @Body() request: LoginWithApiKeyRequestDto,
    @Headers("x-client-id") clientId: string | undefined,
    @ClientIp() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    if (!clientId) {
      throw new BadRequestException("The x-client-id header is required.");
    }

    return this.authentication.loginWithApiKey(
      request.apiKey,
      clientId,
      ipAddress,
      userAgent,
    );
  }

  @Public()
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
    this.authenticationCookieService.setAuthenticationCookies(response, result);
    return { sessionId: result.sessionId };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser()
    user: AuthenticatedUser,

    @Req()
    request: Request,

    @Res({ passthrough: true })
    response: Response,

    @ClientIp()
    ipAddress: string,

    @UserAgent()
    userAgent: string,
  ): Promise<void> {
    const refreshToken = this.authenticationCookieService.get(
      request,
      "refreshToken",
    );

    if (!refreshToken) {
      throw new UnauthorizedException(
        "Refresh token is required.",
      );
    }

    const result =
      await this.authentication.refresh(
        refreshToken,
        user.userId,
        user.clientId,
        ipAddress,
        userAgent,
      );

    this.authenticationCookieService.setRefreshTokenCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser()
    user: AuthenticatedUser,

    @Res({ passthrough: true })
    response: Response,

    @ClientIp()
    ipAddress: string,

    @UserAgent()
    userAgent: string,
  ): Promise<void> {
    await this.authentication.logout(
      user.sessionId,
      user.userId,
      user.clientId,
      ipAddress,
      userAgent,
    );

    this.authenticationCookieService.clearAuthenticationCookies(
      response,
    );
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @CurrentUser()
    user: AuthenticatedUser,

    @Res({ passthrough: true })
    response: Response,

    @ClientIp()
    ipAddress: string,

    @UserAgent()
    userAgent: string,
  ): Promise<void> {
    await this.authentication.logoutAllSessions(
      user.userId,
      user.clientId,
      ipAddress,
      userAgent,
    );

    this.authenticationCookieService.clearAuthenticationCookies(
      response,
    );
  }

  @Get("me")
  async me(
    @CurrentUser()
    user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.principalMapper.toResponse(user);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Body()
    request: ChangePasswordRequestDto,

    @CurrentUser()
    user: AuthenticatedUser,

    @ClientIp()
    ipAddress: string,

    @UserAgent()
    userAgent: string,
  ): Promise<void> {
    if (
      request.newPassword !==
      request.confirmPassword
    ) {
      throw new BadRequestException(
        "New password confirmation does not match.",
      );
    }

    await this.authentication.changePassword(
      user.userId,
      request.currentPassword,
      request.newPassword,
      user.clientId,
      ipAddress,
      userAgent,
    );
  }

  @Public()
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

  @Public()
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

  @Get("api-keys")
  async listApiKeys(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    const apiKeys =
      await this.authentication.listApiKeys(
        user.clientId,
      );

    return apiKeys.map(
      ({ secretHash, ...apiKey }) => apiKey,
    );
  }

  @Delete("api-keys/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeApiKey(
    @Param("id")
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @ClientIp()
    ipAddress: string,

    @UserAgent()
    userAgent: string,
  ): Promise<void> {
    await this.authentication.revokeApiKeyById(
      id,
      user.clientId,
      user.userId,
      ipAddress,
      userAgent,
    );
  }

}
