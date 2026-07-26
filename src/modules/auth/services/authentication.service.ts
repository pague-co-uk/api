import { Injectable } from "@nestjs/common";
import { getComponentLogger, getMeter, recordException, withSpan } from "@pague-co-uk/sms-gateway-telemetry";
import { UserStatus } from "@prisma/client";
import { ClockService } from "src/common/clock.service.js";
import { LoginRequest } from "../dto/login-request.dto.js";
import { AuthenticationFailureReason } from "../enums/authentication-failure-reason.js";
import { LoginStatus } from "../enums/login-status.js";
import { UserRepository } from "../repositories/userRepository.js";
import { LoginFailedResult } from "../types/login-failed-result.js";
import { LoginResult } from "../types/login-result.js";
import { LoginAttemptService } from "./login-attempt.service.js";
import { MfaService } from "./mfa.service.js";
import { PasswordService } from "./password.service.js";
import { RefreshTokenService } from "./refresh-token.service.js";
import { SessionService } from "./session.service.js";

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

  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly loginAttempts: LoginAttemptService,
    private readonly mfa: MfaService,
    private readonly sessions: SessionService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly clock: ClockService,
  ) { }

  async login(
    request: LoginRequest,
  ): Promise<LoginResult> {
    return withSpan(
      "AuthenticationService.login",
      async (span) => {
        this.logger.debug(
          {
            clientId: request.clientId,
            email: request.email,
          },
          "Authenticating user.",
        );

        this.loginAttemptedCounter.add(1);

        span.setAttribute(
          "auth.client.id",
          request.clientId,
        );

        const failed = (
          reason: AuthenticationFailureReason,
        ): LoginFailedResult => {
          span.setAttribute(
            "auth.login.result",
            LoginStatus.FAILED,
          );

          span.setAttribute(
            "auth.login.failure.reason",
            reason,
          );

          span.addEvent(
            "auth.login.failed",
            {
              "auth.login.failure.reason":
                reason,
            },
          );

          this.loginFailedCounter.add(
            1,
            {
              reason,
            },
          );

          this.logger.warn(
            {
              clientId: request.clientId,
              email: request.email,
              reason,
            },
            "Authentication failed.",
          );

          return {
            status: LoginStatus.FAILED,
            reason,
          };
        };

        try {
          // =====================================================
          // Find user
          // =====================================================

          const user =
            await this.users.findByEmail(
              request.clientId,
              request.email,
            );

          if (!user) {
            return failed(
              AuthenticationFailureReason.INVALID_CREDENTIALS,
            );
          }

          span.setAttribute(
            "auth.user.id",
            user.id,
          );

          span.setAttribute(
            "auth.user.status",
            user.status,
          );

          // =====================================================
          // Validate account
          // =====================================================

          if (user.status !== UserStatus.ACTIVE) {
            return failed(
              AuthenticationFailureReason.ACCOUNT_INACTIVE,
            );
          }

          if (
            user.lockedUntil &&
            user.lockedUntil > this.clock.now()
          ) {
            return failed(
              AuthenticationFailureReason.ACCOUNT_LOCKED,
            );
          }

          // =====================================================
          // Verify password
          // =====================================================

          const passwordValid =
            await this.passwords.verify(
              request.password,
              user.passwordHash,
            );

          if (!passwordValid) {
            const attempt =
              await this.loginAttempts.recordFailure(
                user,
              );

            return failed(
              attempt.accountLocked
                ? AuthenticationFailureReason.ACCOUNT_LOCKED
                : AuthenticationFailureReason.INVALID_CREDENTIALS,
            );
          }

          span.addEvent(
            "auth.login.credentials.valid",
          );

          // =====================================================
          // Record successful login attempt
          // =====================================================

          await this.loginAttempts.recordSuccess(
            user,
          );

          // =====================================================
          // Begin MFA
          // =====================================================

          const challenge =
            await this.mfa.begin({
              userId: user.id,
              ipAddress:
                request.ipAddress,
              userAgent:
                request.userAgent,
            });

          if (challenge.required) {
            span.setAttribute(
              "auth.login.result",
              LoginStatus.MFA_REQUIRED,
            );

            span.addEvent(
              "auth.login.mfa.required",
            );

            this.loginMfaRequiredCounter.add(
              1,
            );

            this.logger.info(
              {
                userId: user.id,
                challengeId:
                  challenge.challengeId,
              },
              "MFA challenge created.",
            );

            return {
              status:
                LoginStatus.MFA_REQUIRED,
              challengeId:
                challenge.challengeId,
              expiresAt:
                challenge.expiresAt,
            };
          }

          // =====================================================
          // Create session
          // =====================================================

          const session =
            await this.sessions.createSession({
              userId: user.id,
              ipAddress:
                request.ipAddress,
              userAgent:
                request.userAgent,
              authenticatedWithMfa:
                false,
            });

          span.setAttribute(
            "auth.session.id",
            session.session.id,
          );

          span.addEvent(
            "auth.login.session.created",
          );

          // =====================================================
          // Create refresh token
          // =====================================================

          const authentication =
            await this.refreshTokens.create({
              sessionId:
                session.session.id,
            });

          // =====================================================
          // Success
          // =====================================================

          span.setAttribute(
            "auth.login.result",
            LoginStatus.SUCCESS,
          );

          span.addEvent(
            "auth.login.completed",
          );

          this.loginSucceededCounter.add(
            1,
          );

          this.logger.info(
            {
              userId: user.id,
              sessionId:
                session.session.id,
            },
            "User authenticated.",
          );

          return {
            status:
              LoginStatus.SUCCESS,
            authentication,
          };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              clientId: request.clientId,
              email: request.email,
            },
            "Failed to authenticate user.",
          );

          throw error;
        }
      },
    );
  }
}