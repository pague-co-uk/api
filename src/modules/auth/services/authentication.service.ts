import { Injectable } from '@nestjs/common';
import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from '@pague-co-uk/sms-gateway-telemetry';
import {
  AuthenticationMethod,
  MfaMethod,
  VerificationChannel,
  VerificationPurpose,
} from '@prisma/client';
import { AuditService } from '../../../audit/services/audit.service.js';
import { ClockService } from '../../../common/services/clock.service.js';
import { AppConfigService } from '../../../config/config.service.js';
import { InvalidApiKeyException } from '../../../exceptions/auth/invalid-apikey.exception.js';
import { InvalidCredentialsException } from '../../../exceptions/auth/invalid-credentials.exception.js';
import { VerificationChallengeRepository } from '../../../repositories/verificationChallengeRepository.js';
import { VerificationProviderRegistry } from '../providers/providers.registry.js';
import { ApiKeyService } from './apikey.service.js';
import { AuthenticationEventService } from './authentication-event.service.js';
import { IdentityService } from './identity.service.js';
import { LoginAttemptService } from './login-attempt.service.js';
import { MfaService } from './mfa.service.js';
import { PasswordService } from './password.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { SessionService } from './session.service.js';

@Injectable()
export class AuthenticationService {
  private readonly logger = getComponentLogger(AuthenticationService.name);

  private readonly loginAttemptedCounter = createCounterMetric({
    name: 'auth.login.attempted',
    description: 'Number of login attempts.',
  });

  private readonly loginSucceededCounter = createCounterMetric({
    name: 'auth.login.succeeded',
    description: 'Number of successful logins.',
  });

  private readonly loginFailedCounter = createCounterMetric({
    name: 'auth.login.failed',
    description: 'Number of failed login attempts.',
  });

  private readonly loginMfaRequiredCounter = createCounterMetric({
    name: 'auth.login.mfa.required',
    description: 'Number of login attempts requiring MFA.',
  });

  private readonly refreshCounter = createCounterMetric({
    name: 'auth.refresh.success',
    description: 'Number of successful refresh operations.',
  });

  private readonly refreshFailedCounter = createCounterMetric({
    name: 'auth.refresh.failed',
    description: 'Number of failed refresh operations.',
  });

  private readonly logoutCounter = createCounterMetric({
    name: 'auth.logout.success',
    description: 'Number of successful logout operations.',
  });

  private readonly logoutFailedCounter = createCounterMetric({
    name: 'auth.logout.failed',
    description: 'Number of failed logout operations.',
  });

  private readonly logoutAllCounter = createCounterMetric({
    name: 'auth.logout_all.success',
    description: 'Number of successful logout-all operations.',
  });

  private readonly logoutAllFailedCounter = createCounterMetric({
    name: 'auth.logout_all.failed',
    description: 'Number of failed logout-all operations.',
  });

  private readonly passwordChangedCounter = createCounterMetric({
    name: 'auth.password.changed',
    description: 'Number of successful password changes.',
  });

  private readonly passwordChangeFailedCounter = createCounterMetric({
    name: 'auth.password.change.failed',
    description: 'Number of failed password change attempts.',
  });

  private readonly apiKeyCreatedCounter = createCounterMetric({
    name: 'auth.api_key.created',
    description: 'Number of API keys created.',
  });

  private readonly apiKeyRotatedCounter = createCounterMetric({
    name: 'auth.api_key.rotated',
    description: 'Number of API keys rotated.',
  });

  private readonly apiKeyRevokedCounter = createCounterMetric({
    name: 'auth.api_key.revoked',
    description: 'Number of API keys revoked.',
  });
  constructor(
    private readonly users: IdentityService,
    private readonly passwords: PasswordService,
    private readonly loginAttempts: LoginAttemptService,
    private readonly mfa: MfaService,
    private readonly sessions: SessionService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly clock: ClockService,
    private readonly config: AppConfigService,
    private readonly events: AuthenticationEventService,
    private readonly apiKeys: ApiKeyService,
    private readonly verificationProviders: VerificationProviderRegistry,
    private readonly verificationChallenges: VerificationChallengeRepository,
    private readonly audit: AuditService,
  ) { }

  async login(
    username: string,
    password: string,
    clientId: string,
    ipAddress: string,
    userAgent: string,
    trustedDeviceId?: string | null,
  ): Promise<
    | {
      requiresMfa: true;
      verificationToken: string;
      expiresAt: Date;
    }
    | {
      requiresMfa: false;
      sessionId: string;
      sessionToken: string;
      refreshToken: string;
      refreshTokenExpiresAt: Date;
    }
  > {
    return withSpan('AuthenticationService.login', async (span) => {
      this.logger.info(
        {
          username,
          clientId,
        },
        'Authenticating user.',
      );

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

        if (user.mfaEnabled) {
          const channel = user.preferredMfaMethod === MfaMethod.SMS
            ? VerificationChannel.SMS
            : VerificationChannel.EMAIL;
          const challenge = await this.mfa.createChallenge(
            user.id,
            VerificationPurpose.LOGIN,
            channel,
          );

          await this.verificationProviders.get(channel).send({
            recipient: channel === VerificationChannel.SMS
              ? user.phone ?? user.email
              : user.email,
            code: challenge.code,
            verificationToken: challenge.challengeId,
            purpose: VerificationPurpose.LOGIN,
          });

          this.loginMfaRequiredCounter.add(1);

          return {
            requiresMfa: true,
            verificationToken: challenge.challengeId,
            expiresAt: challenge.expiresAt,
          };
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

        await this.audit.record({
          action: 'auth.login',
          actorId: user.id,
          actorType: 'User',
          clientId,
          resourceType: 'Session',
          resourceId: session.session.id,
          metadata: {
            authenticationMethod: AuthenticationMethod.PASSWORD,
          },
        });

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
          requiresMfa: false,
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

  async loginWithApiKey(
    apiKey: string,
    clientId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    requiresMfa: false;
    apiKeyId: string;
    publicId: string;
    clientId: string;
    expiresAt: Date | null;
  }> {
    return withSpan('AuthenticationService.loginWithApiKey', async (span) => {
      this.logger.info(
        {
          clientId,
          apiKeyPrefix: apiKey.split('.')[0],
        },
        'Authenticating with API key.',
      );

      span.setAttribute('auth.client.id', clientId);

      try {
        const validatedApiKey = await this.apiKeys.validate(apiKey);

        await this.events.recordLoginSucceeded(
          validatedApiKey.id,
          validatedApiKey.id,
          clientId,
          AuthenticationMethod.API_KEY,
          ipAddress,
          userAgent,
        );

        await this.audit.record({
          action: 'auth.login',
          actorId: validatedApiKey.id,
          actorType: 'ApiKey',
          clientId,
          resourceType: 'ApiKey',
          resourceId: validatedApiKey.id,
          metadata: {
            authenticationMethod: AuthenticationMethod.API_KEY,
          },
        });

        this.loginSucceededCounter.add(1);

        span.setAttribute('auth.api_key.id', validatedApiKey.id);
        span.addEvent('auth.login.api_key.succeeded', {
          'auth.api_key.id': validatedApiKey.id,
          'auth.client.id': clientId,
        });

        return {
          requiresMfa: false,
          apiKeyId: validatedApiKey.id,
          publicId: validatedApiKey.publicId,
          clientId: validatedApiKey.clientId,
          expiresAt: validatedApiKey.expiresAt,
        };
      } catch (error) {
        recordException(error);
        this.logger.warn(
          {
            error,
            clientId,
          },
          'API key authentication failed.',
        );

        if (error instanceof InvalidApiKeyException) {
          throw error;
        }

        throw new InvalidApiKeyException();
      }
    });
  }

  async verifyMfa(
    verificationToken: string,
    code: string,
    clientId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    sessionId: string;
    sessionToken: string;
    refreshToken: string;
    refreshTokenExpiresAt: Date;
  }> {
    const challenge = await this.verificationChallenges.findById(
      verificationToken,
    );

    if (!challenge || challenge.purpose !== VerificationPurpose.LOGIN) {
      throw new InvalidCredentialsException();
    }

    await this.mfa.verifyChallenge(
      challenge.userId,
      VerificationPurpose.LOGIN,
      challenge.channel,
      code,
    );

    const authentication = await this.createAuthentication(
      challenge.userId,
      clientId,
      ipAddress,
      userAgent,
      true,
      AuthenticationMethod.PASSWORD,
    );

    await this.audit.record({
      action: 'auth.mfa.verified',
      actorId: challenge.userId,
      actorType: 'User',
      clientId,
      resourceType: 'User',
      resourceId: challenge.userId,
      metadata: {
        purpose: challenge.purpose,
      },
    });

    return authentication;
  }

  async forgotPassword(
    identifier: string,
    clientId: string,
  ): Promise<void> {
    try {
      const user = identifier.includes('@')
        ? await this.users.findByEmail(clientId, identifier)
        : await this.users.findByUsername(identifier);
      const channel = user.preferredMfaMethod === MfaMethod.SMS && user.phone
        ? VerificationChannel.SMS
        : VerificationChannel.EMAIL;
      const challenge = await this.mfa.createChallenge(
        user.id,
        VerificationPurpose.PASSWORD_RESET,
        channel,
      );

      await this.verificationProviders.get(channel).send({
        recipient: channel === VerificationChannel.SMS ? user.phone! : user.email,
        code: challenge.code,
        verificationToken: challenge.challengeId,
        purpose: VerificationPurpose.PASSWORD_RESET,
      });
    } catch {
      // Keep this endpoint account-enumeration safe.
    }
  }

  async resetPassword(
    verificationToken: string,
    code: string,
    newPassword: string,
    clientId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const challenge = await this.verificationChallenges.findById(
      verificationToken,
    );

    if (!challenge || challenge.purpose !== VerificationPurpose.PASSWORD_RESET) {
      throw new InvalidCredentialsException();
    }

    await this.mfa.verifyChallenge(
      challenge.userId,
      VerificationPurpose.PASSWORD_RESET,
      challenge.channel,
      code,
    );
    await this.users.resetPassword(challenge.userId, newPassword);
    await this.sessions.revokeAllSessions(challenge.userId);
    await this.refreshTokens.revokeUserRefreshTokens(challenge.userId);
    await this.events.recordChangePassword(
      challenge.userId,
      clientId,
      ipAddress,
      userAgent,
    );

    await this.audit.record({
      action: 'auth.password.reset',
      actorId: challenge.userId,
      actorType: 'User',
      clientId,
      resourceType: 'User',
      resourceId: challenge.userId,
    });
  }

  private async createAuthentication(
    userId: string,
    clientId: string,
    ipAddress: string,
    userAgent: string,
    authenticatedWithMfa: boolean,
    authenticationMethod: AuthenticationMethod,
  ): Promise<{
    sessionId: string;
    sessionToken: string;
    refreshToken: string;
    refreshTokenExpiresAt: Date;
  }> {
    const session = await this.sessions.createSession(
      userId, ipAddress, userAgent, undefined, authenticatedWithMfa,
    );
    const refreshTokenExpiresAt = new Date(this.clock.now());
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + Number(this.config.auth.refreshTokenTtl),
    );
    const refresh = await this.refreshTokens.issue(
      session.session.id, userId, clientId, refreshTokenExpiresAt,
      authenticationMethod, ipAddress, userAgent,
    );
    await this.events.recordLoginSucceeded(
      userId, session.session.id, clientId, authenticationMethod, ipAddress, userAgent,
    );
    await this.audit.record({
      action: 'auth.login',
      actorId: userId,
      actorType: 'User',
      clientId,
      resourceType: 'Session',
      resourceId: session.session.id,
      metadata: {
        authenticationMethod,
        authenticatedWithMfa,
      },
    });
    return {
      sessionId: session.session.id,
      sessionToken: session.token,
      refreshToken: refresh.refreshToken,
      refreshTokenExpiresAt: refresh.expiresAt,
    };
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

        await this.audit.record({
          action: 'auth.refresh',
          actorId: userId,
          actorType: 'User',
          clientId,
          resourceType: 'RefreshToken',
          resourceId: rotated.refreshTokenId,
        });

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

        await this.audit.record({
          action: 'auth.logout',
          actorId: userId,
          actorType: 'User',
          clientId,
          resourceType: 'Session',
          resourceId: sessionId,
        });

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

        await this.audit.record({
          action: 'auth.logout_all',
          actorId: userId,
          actorType: 'User',
          clientId,
          resourceType: 'User',
          resourceId: userId,
        });

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

        await this.audit.record({
          action: 'auth.password.changed',
          actorId: userId,
          actorType: 'User',
          clientId,
          resourceType: 'User',
          resourceId: userId,
        });

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

          await this.audit.record({
            action: 'apikey.created',
            actorId: userId,
            actorType: 'User',
            clientId,
            resourceType: 'ApiKey',
            resourceId: apiKey.apiKeyId,
            metadata: {
              name,
              publicId: apiKey.publicId,
              prefix: apiKey.prefix,
            },
          });

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

          await this.audit.record({
            action: 'apikey.rotated',
            actorId: userId,
            actorType: 'User',
            clientId,
            resourceType: 'ApiKey',
            resourceId: rotatedApiKey.apiKeyId,
            metadata: {
              publicId: rotatedApiKey.publicId,
              prefix: rotatedApiKey.prefix,
            },
          });

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

          const revokedApiKey = await this.apiKeys.revoke(
            apiKey,
            clientId,
            userId,
            authenticationMethod,
            ipAddress,
            userAgent,
          );

          await this.audit.record({
            action: 'apikey.revoked',
            actorId: userId,
            actorType: 'User',
            clientId,
            resourceType: 'ApiKey',
            resourceId: revokedApiKey.id,
          });

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

  async listApiKeys(clientId: string) {
    return this.apiKeys.list(clientId);
  }

  async revokeApiKeyById(
    apiKeyId: string,
    clientId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.apiKeys.revokeById(
      apiKeyId,
      clientId,
      userId,
      AuthenticationMethod.SESSION,
      ipAddress,
      userAgent,
    );

    await this.audit.record({
      action: 'apikey.revoked',
      actorId: userId,
      actorType: 'User',
      clientId,
      resourceType: 'ApiKey',
      resourceId: apiKeyId,
    });
  }
}
