import { Injectable } from '@nestjs/common';
import {
  getComponentLogger,
  getMeter,
  recordException,
  withSpan,
} from '@pague-co-uk/sms-gateway-telemetry';
import { AuthenticationMethod } from '@prisma/client';
import { ClockService } from 'src/common/services/clock.service.js';
import { AppConfigService } from 'src/config/config.service.js';
import { InvalidCredentialsException } from 'src/exceptions/auth/invalid-credentials.exception.js';
import { ApiKeyService } from './apikey.service.js';
import { AuthenticationEventService } from './authentication-event.service.js';
import { LoginAttemptService } from './login-attempt.service.js';
import { MfaService } from './mfa.service.js';
import { PasswordService } from './password.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { SessionService } from './session.service.js';
import { UserService } from './user.service.js';

@Injectable()
export class AuthenticationService {
  private readonly logger = getComponentLogger(AuthenticationService.name);

  private readonly loginAttemptedCounter = getMeter().createCounter(
    'auth.login.attempted',
    {
      description: 'Number of login attempts.',
    },
  );

  private readonly loginSucceededCounter = getMeter().createCounter(
    'auth.login.succeeded',
    {
      description: 'Number of successful logins.',
    },
  );

  private readonly loginFailedCounter = getMeter().createCounter(
    'auth.login.failed',
    {
      description: 'Number of failed login attempts.',
    },
  );

  private readonly loginMfaRequiredCounter = getMeter().createCounter(
    'auth.login.mfa.required',
    {
      description: 'Number of login attempts requiring MFA.',
    },
  );

  private readonly refreshCounter = getMeter().createCounter(
    'auth.refresh.success',
    {
      description: 'Number of successful refresh operations.',
    },
  );

  private readonly refreshFailedCounter = getMeter().createCounter(
    'auth.refresh.failed',
    {
      description: 'Number of failed refresh operations.',
    },
  );

  private readonly logoutCounter = getMeter().createCounter(
    'auth.logout.success',
    {
      description: 'Number of successful logout operations.',
    },
  );

  private readonly logoutFailedCounter = getMeter().createCounter(
    'auth.logout.failed',
    {
      description: 'Number of failed logout operations.',
    },
  );

  private readonly logoutAllCounter = getMeter().createCounter(
    'auth.logout_all.success',
    {
      description: 'Number of successful logout-all operations.',
    },
  );

  private readonly logoutAllFailedCounter = getMeter().createCounter(
    'auth.logout_all.failed',
    {
      description: 'Number of failed logout-all operations.',
    },
  );

  private readonly passwordChangedCounter = getMeter().createCounter(
    'auth.password.changed',
    {
      description: 'Number of successful password changes.',
    },
  );

  private readonly passwordChangeFailedCounter = getMeter().createCounter(
    'auth.password.change.failed',
    {
      description: 'Number of failed password change attempts.',
    },
  );

  private readonly apiKeyCreatedCounter = getMeter().createCounter(
    'auth.api_key.created',
    {
      description: 'Number of API keys created.',
    },
  );

  private readonly apiKeyRotatedCounter = getMeter().createCounter(
    'auth.api_key.rotated',
    {
      description: 'Number of API keys rotated.',
    },
  );

  private readonly apiKeyRevokedCounter = getMeter().createCounter(
    'auth.api_key.revoked',
    {
      description: 'Number of API keys revoked.',
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
    private readonly events: AuthenticationEventService,
    private readonly apiKeys: ApiKeyService
  ) { }

  async login(
    username: string,
    password: string,
    clientId: string,
    ipAddress: string,
    userAgent: string,
    trustedDeviceId?: string | null,
  ): Promise<{
    sessionId: string;
    sessionToken: string;
    refreshToken: string;
    refreshTokenExpiresAt: Date;
  }> {
    return withSpan('AuthenticationService.login', async (span) => {
      this.logger.info(
        {
          username,
          clientId,
        },
        'Authenticating user.',
      );

      span.setAttribute('auth.username', username);

      span.setAttribute('auth.client.id', clientId);

      try {
        // =====================================================
        // Lookup user
        // =====================================================

        const user = await this.users.findByUsername(username);

        span.setAttribute('auth.user.id', user!.id);

        // =====================================================
        // Verify password
        // =====================================================

        try {
          await this.users.verifyPassword(user, password);
        } catch {
          await this.loginAttempts.recordFailure(user);

          this.loginFailedCounter.add(1);

          throw new InvalidCredentialsException();
        }

        // =====================================================
        // Successful authentication
        // =====================================================

        await this.loginAttempts.recordSuccess(user);

        if (user.lockedUntil) {
          await this.loginAttempts.clearLock(user);
        }

        // =====================================================
        // Create authenticated session
        // =====================================================

        const session = await this.sessions.createSession(
          user.id,
          ipAddress,
          userAgent,
          trustedDeviceId ?? undefined,
          false,
        );

        // =====================================================
        // Issue refresh token
        // =====================================================

        const now = this.clock.now();

        const refreshTokenExpiresAt = new Date(now.getTime());

        refreshTokenExpiresAt.setDate(
          refreshTokenExpiresAt.getDate() +
          Number(this.config.auth.refreshTokenTtl),
        );
        const refresh = await this.refreshTokens.issue(
          session.session.id,
          user.id,
          clientId,
          refreshTokenExpiresAt,
          AuthenticationMethod.PASSWORD,
          ipAddress,
          userAgent,
        );

        // =====================================================
        // Authentication event
        // =====================================================

        await this.events.recordLoginSucceeded(
          user.id,
          session.session.id,
          clientId,
          AuthenticationMethod.PASSWORD,
          ipAddress,
          userAgent,
        );

        // =====================================================
        // Observability
        // =====================================================

        this.loginSucceededCounter.add(1);

        span.setAttribute('auth.session.id', session.session.id);

        span.addEvent('auth.login.succeeded', {
          'auth.user.id': user.id,
          'auth.session.id': session.session.id,
        });

        this.logger.info(
          {
            userId: user.id,
            sessionId: session.session.id,
            clientId,
          },
          'User authenticated successfully.',
        );

        // =====================================================
        // Response
        // =====================================================

        return {
          sessionId: session.session.id,
          sessionToken: session.token,
          refreshToken: refresh.refreshToken,
          refreshTokenExpiresAt: refresh.expiresAt,
        };
      } catch (error) {
        recordException(error);

        this.logger.warn(
          {
            error,
            username: username,
            clientId,
          },
          'Authentication failed.',
        );

        throw error;
      }
    });
  }

  async refresh(
    refreshTokenValue: string,
    userId: string,
    clientId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ refreshToken: string; refreshTokenExpiresAt: Date }> {
    return withSpan('AuthenticationService.refresh', async (span) => {
      this.logger.info(
        {
          clientId,
        },
        'Refreshing authenticated session.',
      );

      span.setAttribute('auth.client.id', clientId);

      try {
        // =====================================================
        // Validate refresh token
        // =====================================================

        const refreshToken =
          await this.refreshTokens.validate(refreshTokenValue);

        // =====================================================
        // Compute new refresh token expiry
        // =====================================================

        const refreshTokenExpiresAt = new Date(this.clock.now());

        refreshTokenExpiresAt.setDate(
          refreshTokenExpiresAt.getDate() +
          Number(this.config.auth.refreshTokenTtl),
        );

        // =====================================================
        // Rotate refresh token
        // =====================================================

        const rotated = await this.refreshTokens.rotate(
          refreshTokenValue,
          refreshToken.sessionId,
          userId,
          clientId,
          refreshTokenExpiresAt,
          AuthenticationMethod.REFRESH_TOKEN,
          ipAddress,
          userAgent,
        );

        // =====================================================
        // Touch session
        // =====================================================

        await this.sessions.touchSession(refreshToken.sessionId);

        // =====================================================
        // Observability
        // =====================================================

        this.refreshCounter.add(1);

        span.setAttribute('auth.session.id', refreshToken.sessionId);

        span.setAttribute('auth.refresh.id', rotated.refreshTokenId);

        span.addEvent('auth.refresh.completed');

        this.logger.info(
          {
            sessionId: refreshToken.sessionId,
            refreshTokenId: rotated.refreshTokenId,
            clientId,
          },
          'Authentication refreshed successfully.',
        );

        // =====================================================
        // Response
        // =====================================================

        return {
          refreshToken: rotated.refreshToken,
          refreshTokenExpiresAt: rotated.expiresAt,
        };
      } catch (error) {
        recordException(error);

        this.refreshFailedCounter.add(1);

        this.logger.warn(
          {
            error,
            clientId,
          },
          'Failed to refresh authentication.',
        );

        throw error;
      }
    });
  }

  async logout(
    sessionId: string,
    userId: string,
    clientId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    return withSpan('AuthenticationService.logout', async (span) => {
      this.logger.info(
        {
          sessionId,
        },
        'Logging out session.',
      );

      span.setAttribute('auth.session.id', sessionId);

      try {
        await this.sessions.revokeSession(sessionId);

        await this.refreshTokens.revokeSessionRefreshTokens(
          sessionId,
          userId,
          clientId,
          AuthenticationMethod.PASSWORD,
          ipAddress,
          userAgent,
        );

        await this.events.recordSessionRevoked(
          userId,
          sessionId,
          clientId,
          AuthenticationMethod.PASSWORD,
          ipAddress,
          userAgent,
        );

        this.logoutCounter.add(1);

        span.addEvent('auth.logout.completed');

        this.logger.info(
          {
            sessionId,
          },
          'Session logged out successfully.',
        );
      } catch (error) {
        recordException(error);

        this.logoutFailedCounter.add(1);

        this.logger.warn(
          {
            error,
            sessionId,
          },
          'Failed to log out session.',
        );

        throw error;
      }
    });
  }

  async logoutAllSessions(
    userId: string,
    clientId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    return withSpan('AuthenticationService.logoutAllSessions', async (span) => {
      this.logger.info(
        {
          userId,
          clientId,
        },
        'Logging out all user sessions.',
      );

      span.setAttribute('auth.user.id', userId);

      try {
        await this.sessions.revokeAllSessions(userId);

        await this.refreshTokens.revokeUserRefreshTokens(userId);

        await this.events.recordAllSessionsRevoked(
          userId,
          clientId,
          ipAddress,
          userAgent,
          AuthenticationMethod.PASSWORD,
        );

        this.logoutAllCounter.add(1);

        span.addEvent('auth.logout_all.completed');

        this.logger.info(
          {
            userId,
          },
          'All user sessions logged out successfully.',
        );
      } catch (error) {
        recordException(error);

        this.logoutAllFailedCounter.add(1);

        this.logger.warn(
          {
            error,
            userId,
          },
          'Failed to log out all user sessions.',
        );

        throw error;
      }
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    clientId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    return withSpan('AuthenticationService.changePassword', async (span) => {
      this.logger.info(
        {
          userId,
          clientId,
        },
        'Changing user password.',
      );

      span.setAttribute('auth.user.id', userId);

      span.setAttribute('auth.client.id', clientId);

      try {
        // =====================================================
        // Business logic
        // =====================================================

        await this.users.changePassword(userId, currentPassword, newPassword);

        await this.sessions.revokeAllSessions(userId);

        await this.refreshTokens.revokeUserRefreshTokens(userId);

        await this.events.recordChangePassword(
          userId,
          clientId,
          ipAddress,
          userAgent,
        );

        // =====================================================
        // Observability
        // =====================================================

        this.passwordChangedCounter.add(1);

        span.addEvent('auth.password.changed');

        this.logger.info(
          {
            userId,
          },
          'Password changed successfully.',
        );
      } catch (error) {
        recordException(error);

        this.passwordChangeFailedCounter.add(1);

        this.logger.error(
          {
            error,
            userId,
          },
          'Failed to change password.',
        );

        throw error;
      }
    });
  }

  async createApiKey(
    clientId: string,
    name: string,
    userId: string,
    authenticationMethod: AuthenticationMethod,
    expiresAt?: Date | null,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<{
    apiKeyId: string;
    publicId: string;
    apiKey: string;
    prefix: string;
    expiresAt: Date | null;
  }> {
    return withSpan(
      "AuthenticationService.createApiKey",
      async (span) => {
        this.logger.info(
          {
            clientId,
            name,
          },
          "Creating API key.",
        );

        span.setAttribute(
          "auth.client.id",
          clientId,
        );

        try {
          // =====================================================
          // Business logic
          // =====================================================

          const apiKey =
            await this.apiKeys.create(
              clientId,
              name,
              userId,
              authenticationMethod,
              expiresAt,
              ipAddress,
              userAgent,
            );

          // =====================================================
          // Observability
          // =====================================================

          this.apiKeyCreatedCounter.add(1);

          span.setAttribute(
            "auth.api_key.id",
            apiKey.apiKeyId,
          );

          span.addEvent(
            "auth.api_key.created",
          );

          this.logger.info(
            {
              apiKeyId: apiKey.apiKeyId,
              clientId,
            },
            "API key created successfully.",
          );

          return apiKey;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              clientId,
            },
            "Failed to create API key.",
          );

          throw error;
        }
      },
    );
  }

  async rotateApiKey(
    apiKey: string,
    clientId: string,
    userId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<{
    apiKeyId: string;
    publicId: string;
    apiKey: string;
    prefix: string;
    expiresAt: Date | null;
  }> {
    return withSpan(
      "AuthenticationService.rotateApiKey",
      async (span) => {
        this.logger.info(
          {
            clientId,
          },
          "Rotating API key.",
        );

        span.setAttribute(
          "auth.client.id",
          clientId,
        );

        try {
          // =====================================================
          // Business logic
          // =====================================================

          const rotatedApiKey =
            await this.apiKeys.rotate(
              apiKey,
              clientId,
              userId,
              authenticationMethod,
              ipAddress,
              userAgent,
            );

          // =====================================================
          // Observability
          // =====================================================

          this.apiKeyRotatedCounter.add(1);

          span.addEvent(
            "auth.api_key.rotated",
          );

          this.logger.info(
            {
              apiKeyId: rotatedApiKey.apiKeyId,
            },
            "API key rotated successfully.",
          );

          return rotatedApiKey;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              clientId,
            },
            "Failed to rotate API key.",
          );

          throw error;
        }
      },
    );
  }

  async revokeApiKey(
    apiKey: string,
    clientId: string,
    userId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return withSpan(
      "AuthenticationService.revokeApiKey",
      async (span) => {
        this.logger.info(
          {
            clientId,
          },
          "Revoking API key.",
        );

        span.setAttribute(
          "auth.client.id",
          clientId,
        );

        try {
          // =====================================================
          // Business logic
          // =====================================================

          await this.apiKeys.revoke(
            apiKey,
            clientId,
            userId,
            authenticationMethod,
            ipAddress,
            userAgent,
          );

          // =====================================================
          // Observability
          // =====================================================

          this.apiKeyRevokedCounter.add(1);

          span.addEvent(
            "auth.api_key.revoked",
          );

          this.logger.info(
            {
              clientId,
            },
            "API key revoked successfully.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              clientId,
            },
            "Failed to revoke API key.",
          );

          throw error;
        }
      },
    );
  }
}
