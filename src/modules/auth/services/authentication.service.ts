import { Injectable } from "@nestjs/common";
import { getComponentLogger, getMeter, recordException, withSpan } from "@pague-co-uk/sms-gateway-telemetry";
import { AuthenticationMethod } from "@prisma/client";
import { ClockService } from "src/common/clock.service.js";
import { AppConfigService } from "src/config/config.service.js";
import { InvalidCredentialsException } from "src/exceptions/invalid-credentials.exception.js";
import { LoginRequest } from "../dto/login-request.dto.js";
import { LoginResponse } from "../dto/login-response.js";
import { LogoutAllSessionsRequest } from "../dto/logout-all-sessions-request.js";
import { LogoutRequest } from "../dto/logout.dto.js";
import { RefreshRequest } from "../dto/refresh-request.dto.js";
import { RefreshResponse } from "../dto/refresh-response.js";
import { AuthenticationEventService } from "./authentication-event.service.js";
import { LoginAttemptService } from "./login-attempt.service.js";
import { MfaService } from "./mfa.service.js";
import { PasswordService } from "./password.service.js";
import { RefreshTokenService } from "./refresh-token.service.js";
import { SessionService } from "./session.service.js";
import { UserService } from "./user.service.js";

@Injectable()
export class AuthenticationService {
  private readonly logger =
    getComponentLogger(AuthenticationService.name);

  private readonly loginAttemptedCounter = getMeter().createCounter(
    "auth.login.attempted",
    {
      description:
        "Number of login attempts.",
    },
  );

  private readonly loginSucceededCounter = getMeter().createCounter(
    "auth.login.succeeded",
    {
      description:
        "Number of successful logins.",
    },
  );

  private readonly loginFailedCounter = getMeter().createCounter(
    "auth.login.failed",
    {
      description:
        "Number of failed login attempts.",
    },
  );

  private readonly loginMfaRequiredCounter = getMeter().createCounter(
    "auth.login.mfa.required",
    {
      description:
        "Number of login attempts requiring MFA.",
    },
  );

  private readonly refreshCounter = getMeter().
    createCounter(
      "auth.refresh.success",
      {
        description:
          "Number of successful refresh operations.",
      },
    );

  private readonly refreshFailedCounter =
    getMeter().createCounter(
      "auth.refresh.failed",
      {
        description:
          "Number of failed refresh operations.",
      },
    );

  private readonly logoutCounter = getMeter().createCounter(
    "auth.logout.success",
    {
      description:
        "Number of successful logout operations.",
    },
  );

  private readonly logoutFailedCounter = getMeter().createCounter(
    "auth.logout.failed",
    {
      description:
        "Number of failed logout operations.",
    },
  );

  private readonly logoutAllCounter = getMeter().createCounter(
    "auth.logout_all.success",
    {
      description:
        "Number of successful logout-all operations.",
    },
  );

  private readonly logoutAllFailedCounter =
    getMeter().createCounter(
      "auth.logout_all.failed",
      {
        description:
          "Number of failed logout-all operations.",
      },
    );

  constructor(
    private readonly users: UserService,
    private readonly passwords: PasswordService,
    private readonly loginAttempts: LoginAttemptService,
    private readonly mfa: MfaService,
    private readonly sessions: SessionService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly clock: ClockService,
    private readonly config: AppConfigService,
    private readonly events: AuthenticationEventService
  ) { }

  async login(
    request: LoginRequest,
  ): Promise<LoginResponse> {
    return withSpan(
      "AuthenticationService.login",
      async (span) => {
        this.logger.info(
          {
            username: request.username,
            clientId: request.clientId,
          },
          "Authenticating user.",
        );

        span.setAttribute(
          "auth.username",
          request.username,
        );

        span.setAttribute(
          "auth.client.id",
          request.clientId,
        );

        try {
          // =====================================================
          // Lookup user
          // =====================================================

          const user =
            await this.users.findByUsername(
              request.username,
            );

          span.setAttribute(
            "auth.user.id",
            user!.id,
          );

          // =====================================================
          // Verify password
          // =====================================================

          try {
            await this.users.verifyPassword(
              user,
              request.password,
            );
          } catch {
            await this.loginAttempts.recordFailure(
              user,
            );

            this.loginFailedCounter.add(1);

            throw new InvalidCredentialsException();
          }

          // =====================================================
          // Successful authentication
          // =====================================================

          await this.loginAttempts.recordSuccess(
            user,
          );

          if (user.lockedUntil) {
            await this.loginAttempts.clearLock(
              user,
            );
          }

          // =====================================================
          // Create authenticated session
          // =====================================================

          const session =
            await this.sessions.createSession({
              userId: user.id,
              ipAddress: request.ipAddress,
              userAgent: request.userAgent,
              trustedDeviceId:
                request.trustedDeviceId,
              authenticatedWithMfa: false,
            });

          // =====================================================
          // Issue refresh token
          // =====================================================

          const now = this.clock.now();

          const refreshTokenExpiresAt = new Date(
            now.getTime(),
          );

          refreshTokenExpiresAt.setDate(
            refreshTokenExpiresAt.getDate() + Number(
              this.config.auth.refreshTokenTtl),
          );
          const refresh =
            await this.refreshTokens.issue({
              sessionId:
                session.session.id,
              userId: user.id,
              clientId: request.clientId,
              authenticationMethod:
                AuthenticationMethod.PASSWORD,
              ipAddress:
                request.ipAddress,
              userAgent:
                request.userAgent,
              expiresAt:
                refreshTokenExpiresAt,
            });

          // =====================================================
          // Authentication event
          // =====================================================

          await this.events.recordLoginSucceeded({
            userId: user.id,
            sessionId:
              session.session.id,
            clientId:
              request.clientId,
            authenticationMethod:
              AuthenticationMethod.PASSWORD,
            ipAddress:
              request.ipAddress,
            userAgent:
              request.userAgent,
          });

          // =====================================================
          // Observability
          // =====================================================

          this.loginSucceededCounter.add(1);

          span.setAttribute(
            "auth.session.id",
            session.session.id,
          );

          span.addEvent(
            "auth.login.succeeded",
            {
              "auth.user.id":
                user.id,
              "auth.session.id":
                session.session.id,
            },
          );

          this.logger.info(
            {
              userId: user.id,
              sessionId:
                session.session.id,
              clientId:
                request.clientId,
            },
            "User authenticated successfully.",
          );

          // =====================================================
          // Response
          // =====================================================

          return {
            sessionId:
              session.session.id,
            sessionToken:
              session.token,
            refreshToken:
              refresh.refreshToken,
            refreshTokenExpiresAt:
              refresh.expiresAt,
          };
        } catch (error) {
          recordException(error);

          this.logger.warn(
            {
              error,
              username:
                request.username,
              clientId:
                request.clientId,
            },
            "Authentication failed.",
          );

          throw error;
        }
      },
    );
  }

  async refresh(
    request: RefreshRequest,
  ): Promise<RefreshResponse> {
    return withSpan(
      "AuthenticationService.refresh",
      async (span) => {
        this.logger.info(
          {
            clientId: request.clientId,
          },
          "Refreshing authenticated session.",
        );

        span.setAttribute(
          "auth.client.id",
          request.clientId,
        );

        try {
          // =====================================================
          // Validate refresh token
          // =====================================================

          const refreshToken =
            await this.refreshTokens.validate({
              refreshToken:
                request.refreshToken,
            });

          // =====================================================
          // Compute new refresh token expiry
          // =====================================================

          const refreshTokenExpiresAt =
            new Date(this.clock.now());

          refreshTokenExpiresAt.setDate(
            refreshTokenExpiresAt.getDate() + Number(
              this.config.auth
                .refreshTokenTtl),
          );

          // =====================================================
          // Rotate refresh token
          // =====================================================

          const rotated =
            await this.refreshTokens.rotate({
              refreshToken:
                request.refreshToken,
              sessionId:
                refreshToken.sessionId,
              userId:
                request.userId,
              clientId:
                request.clientId,
              authenticationMethod:
                AuthenticationMethod
                  .REFRESH_TOKEN,
              ipAddress:
                request.ipAddress,
              userAgent:
                request.userAgent,
              expiresAt:
                refreshTokenExpiresAt,
            });

          // =====================================================
          // Touch session
          // =====================================================

          await this.sessions.touchSession({
            sessionId:
              refreshToken.sessionId,
          });

          // =====================================================
          // Observability
          // =====================================================

          this.refreshCounter.add(1);

          span.setAttribute(
            "auth.session.id",
            refreshToken.sessionId,
          );

          span.setAttribute(
            "auth.refresh.id",
            rotated.refreshTokenId,
          );

          span.addEvent(
            "auth.refresh.completed",
          );

          this.logger.info(
            {
              sessionId:
                refreshToken.sessionId,
              refreshTokenId:
                rotated.refreshTokenId,
              clientId:
                request.clientId,
            },
            "Authentication refreshed successfully.",
          );

          // =====================================================
          // Response
          // =====================================================

          return {
            refreshToken:
              rotated.refreshToken,
            refreshTokenExpiresAt:
              rotated.expiresAt,
          };
        } catch (error) {
          recordException(error);

          this.refreshFailedCounter.add(1);

          this.logger.warn(
            {
              error,
              clientId:
                request.clientId,
            },
            "Failed to refresh authentication.",
          );

          throw error;
        }
      },
    );
  }

  async logout(
    request: LogoutRequest,
  ): Promise<void> {
    return withSpan(
      "AuthenticationService.logout",
      async (span) => {
        this.logger.info(
          {
            sessionId: request.sessionId,
          },
          "Logging out session.",
        );

        span.setAttribute(
          "auth.session.id",
          request.sessionId,
        );

        span.setAttribute(
          "auth.session.id",
          request.sessionId,
        );

        try {
          await this.sessions.revokeSession({
            sessionId: request.sessionId,
          });

          await this.refreshTokens
            .revokeSessionRefreshTokens(request);

          await this.events
            .recordSessionRevoked({
              sessionId: request.sessionId,
              userId: request.userId,
              clientId: request.clientId,
              ipAddress: request.ipAddress,
              userAgent: request.userAgent,
              authenticationMethod: AuthenticationMethod.PASSWORD
            });

          this.logoutCounter.add(1);

          span.addEvent(
            "auth.logout.completed",
          );

          this.logger.info(
            {
              sessionId: request.sessionId,
            },
            "Session logged out successfully.",
          );
        } catch (error) {
          recordException(error);

          this.logoutFailedCounter.add(1);

          this.logger.warn(
            {
              error,
              sessionId: request.sessionId,
            },
            "Failed to log out session.",
          );

          throw error;
        }
      },
    );
  }

  async logoutAllSessions(
    request: LogoutAllSessionsRequest,
  ): Promise<void> {
    return withSpan(
      "AuthenticationService.logoutAllSessions",
      async (span) => {
        this.logger.info(
          {
            userId: request.userId,
            clientId: request.clientId,
          },
          "Logging out all user sessions.",
        );

        span.setAttribute(
          "auth.user.id",
          request.userId,
        );

        try {
          await this.sessions.revokeAllSessions(request.userId);

          await this.refreshTokens.revokeSessionRefreshTokens(request);

          await this.events.recordAllSessionsRevoked({
            userId: request.userId,
            clientId: request.clientId,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
          });

          this.logoutAllCounter.add(1);

          span.addEvent(
            "auth.logout_all.completed",
          );

          this.logger.info(
            {
              userId: request.userId,
            },
            "All user sessions logged out successfully.",
          );

        } catch (error) {
          recordException(error);

          this.logoutAllFailedCounter.add(1);

          this.logger.warn(
            {
              error,
              userId: request.userId,
            },
            "Failed to log out all user sessions.",
          );

          throw error;
        }
      },
    );
  }
}