import { Injectable } from '@nestjs/common';
import type { CounterMetric } from '@pague-co-uk/sms-gateway-telemetry';
import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from '@pague-co-uk/sms-gateway-telemetry';
import {
  AuthenticationEventType,
  AuthenticationMethod,
  Prisma,
} from '@prisma/client';

import { AuthenticationEventRepository } from '../../../repositories/AuthenticationEventRepository.js';

@Injectable()
export class AuthenticationEventService {
  // =====================================================
  // Logger
  // =====================================================

  private readonly logger = getComponentLogger(AuthenticationEventService.name);

  // =====================================================
  // Metrics
  // =====================================================

  private readonly loginSucceededCounter = createCounterMetric({
    name: 'auth.event.login.succeeded',
    description: 'Number of successful login audit events.',
  });

  private readonly loginFailedCounter = createCounterMetric({
    name: 'auth.event.login.failed',
    description: 'Number of failed login audit events.',
  });

  private readonly mfaChallengeCounter = createCounterMetric({
    name: 'auth.event.mfa.challenge',
    description: 'Number of MFA challenge audit events.',
  });

  private readonly mfaVerifiedCounter = createCounterMetric({
    name: 'auth.event.mfa.verified',
    description: 'Number of MFA verification audit events.',
  });

  private readonly refreshIssuedCounter = createCounterMetric({
    name: 'auth.event.refresh.issued',
    description: 'Number of refresh token issuance events.',
  });

  private readonly apiKeyCreatedCounter = createCounterMetric({
    name: 'auth.event.api_key.created',
    description: 'Number of Api Keys issued.',
  });
  private readonly refreshRotatedCounter = createCounterMetric({
    name: 'auth.event.refresh.rotated',
    description: 'Number of refresh token rotation events.',
  });

  private readonly refreshRevokedCounter = createCounterMetric({
    name: 'auth.event.refresh.revoked',
    description: 'Number of refresh token revocation events.',
  });

  private readonly sessionRevokedCounter = createCounterMetric({
    name: 'auth.event.session.revoked',
    description: 'Number of session revocation events.',
  });

  private readonly logoutCounter = createCounterMetric({
    name: 'auth.event.logout',
    description: 'Number of logout events.',
  });

  private readonly logoutAllCounter = createCounterMetric({
    name: 'auth.event.logout.all',
    description: 'Number of logout all events.',
  });

  private readonly apiKeyRotatedCounter = createCounterMetric({
    name: 'auth.event.api_key.rotated',
    description: 'Number of API key rotation audit events.',
  });

  private readonly apiKeyRevokedCounter = createCounterMetric({
    name: 'auth.event.api_key.revoked',
    description: 'Number of API key revocation audit events.',
  });

  private readonly passwordChangedCounter = createCounterMetric({
    name: 'auth.event.password.changed',
    description: 'Number of passwords changed audit events.',
  });
  // =====================================================
  // Constructor
  // =====================================================

  constructor(private readonly events: AuthenticationEventRepository) {
    this.events = events;
  }

  // =====================================================
  // Public API
  // =====================================================

  withDatabase(db: Prisma.TransactionClient): AuthenticationEventService {
    return new AuthenticationEventService(this.events.withDatabase(db));
  }

  async recordApiKeyCreated(
    clientId: string,
    userId: string,
    ipAddress?: string | null,
    userAgent?: string | null,
    authenticationMethod: AuthenticationMethod = AuthenticationMethod.SYSTEM,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordApiKeyCreated',
      AuthenticationEventType.API_KEY_CREATED,
      {
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        ipAddress,
        userAgent,
        authenticationMethod,
      },
      this.apiKeyCreatedCounter,
      {
        userId,
        clientId,
      },
    );
  }

  async recordApiKeyRevoked(
    clientId: string,
    userId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordApiKeyRevoked',
      AuthenticationEventType.API_KEY_REVOKED,
      {
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        authenticationMethod,
        ipAddress,
        userAgent,
      },
      this.apiKeyRevokedCounter,
      {
        userId,
        clientId,
      },
    );
  }

  async recordAllSessionsRevoked(
    userId: string,
    clientId: string,
    ipAddress?: string | null,
    userAgent?: string | null,
    authenticationMethod: AuthenticationMethod = AuthenticationMethod.PASSWORD,
  ): Promise<void> {
    return withSpan(
      'AuthenticationEventService.recordAllSessionsRevoked',
      async (span) => {
        this.logger.info(
          {
            userId,
            clientId,
          },
          'Recording all sessions revoked event.',
        );

        span.setAttribute('auth.user.id', userId);
        span.setAttribute('auth.client.id', clientId);

        try {
          await this.events.create({
            user: this.connectUser(userId),
            sessionId: null,
            client: this.connectClient(clientId),
            type: AuthenticationEventType.LOGOUT_ALL,
            authenticationMethod,
            ipAddress,
            userAgent,
          });

          this.logoutAllCounter.add(1, {
            event_type: AuthenticationEventType.LOGOUT_ALL,
          });

          span.addEvent('auth.all_sessions_revoked.recorded');

          this.logger.info(
            {
              userId,
            },
            'All sessions revoked event recorded successfully.',
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              userId,
            },
            'Failed to record all sessions revoked event.',
          );

          throw error;
        }
      },
    );
  }

  async recordApiKeyRotated(
    clientId: string,
    userId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordApiKeyRotated',
      AuthenticationEventType.API_KEY_ROTATED,
      {
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        authenticationMethod,
        ipAddress,
        userAgent,
      },
      this.apiKeyRotatedCounter,
      {
        userId,
        clientId,
      },
    );
  }

  async recordLoginSucceeded(
    userId: string,
    sessionId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordLoginSucceeded',
      AuthenticationEventType.LOGIN_SUCCESS,
      {
        authenticationMethod,
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        sessionId,
        ipAddress,
        userAgent,
      },
      this.loginSucceededCounter,
      {
        userId,
        clientId,
        sessionId,
      },
    );
  }

  private connectUser(userId: string) {
    return {
      connect: {
        id: userId,
      },
    };
  }

  private connectClient(clientId: string) {
    return {
      connect: {
        id: clientId,
      },
    };
  }

  async recordLoginFailed(
    userId: string,
    sessionId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
    failureReason?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordLoginFailed',
      AuthenticationEventType.LOGIN_FAILED,
      {
        authenticationMethod,
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        sessionId,
        ipAddress,
        userAgent,
        failureReason,
      },
      this.loginFailedCounter,
      {
        userId,
        clientId,
        sessionId,
      },
    );
  }

  async recordMfaChallengeCreated(
    userId: string,
    sessionId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordMfaChallengeCreated',
      AuthenticationEventType.MFA_CHALLENGE_CREATED,
      {
        authenticationMethod,
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        sessionId,
        ipAddress,
        userAgent,
      },
      this.mfaChallengeCounter,
      {
        userId,
        clientId,
        sessionId,
      },
    );
  }

  async recordMfaVerified(
    userId: string,
    sessionId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordMfaVerified',
      AuthenticationEventType.MFA_VERIFIED,
      {
        authenticationMethod,
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        sessionId,
        ipAddress,
        userAgent,
      },
      this.mfaVerifiedCounter,
      {
        userId,
        clientId,
        sessionId,
      },
    );
  }

  async recordRefreshTokenIssued(
    userId: string,
    sessionId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordRefreshTokenIssued',
      AuthenticationEventType.REFRESH_TOKEN_ISSUED,
      {
        authenticationMethod,
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        sessionId,
        ipAddress,
        userAgent,
      },
      this.refreshIssuedCounter,
      {
        userId,
        clientId,
        sessionId,
      },
    );
  }

  async recordRefreshTokenRotated(
    userId: string,
    sessionId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordRefreshTokenRotated',
      AuthenticationEventType.REFRESH_TOKEN_ROTATED,
      {
        authenticationMethod,
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        sessionId,
        ipAddress,
        userAgent,
      },
      this.refreshRotatedCounter,
      {
        userId,
        clientId,
        sessionId,
      },
    );
  }

  async recordRefreshTokenRevoked(
    userId: string,
    sessionId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordRefreshTokenRevoked',
      AuthenticationEventType.REFRESH_TOKEN_REVOKED,
      {
        authenticationMethod,
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        sessionId,
        ipAddress,
        userAgent,
      },
      this.refreshRevokedCounter,
      {
        userId,
        clientId,
        sessionId,
      },
    );
  }

  async recordSessionRevoked(
    userId: string,
    sessionId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordSessionRevoked',
      AuthenticationEventType.SESSION_REVOKED,
      {
        authenticationMethod,
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        sessionId,
        ipAddress,
        userAgent,
      },
      this.sessionRevokedCounter,
      {
        userId,
        clientId,
        sessionId,
      },
    );
  }

  async recordLogout(
    userId: string,
    sessionId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordLogout',
      AuthenticationEventType.LOGOUT,
      {
        authenticationMethod,
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        sessionId,
        ipAddress,
        userAgent,
      },
      this.logoutCounter,
      {
        userId,
        clientId,
        sessionId,
      },
    );
  }

  async recordLogoutAll(
    userId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return this.recordEvent(
      'AuthenticationEventService.recordLogoutAll',
      AuthenticationEventType.LOGOUT_ALL,
      {
        authenticationMethod,
        client: this.connectClient(clientId),
        user: this.connectUser(userId),
        ipAddress,
        userAgent,
      },
      this.logoutAllCounter,
      {
        userId,
        clientId,
      },
    );
  }

  async recordChangePassword(
    userId: string,
    clientId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    return withSpan(
      'AuthenticationEventService.recordChangePassword',
      async (span) => {
        this.logger.info(
          {
            userId,
            clientId,
          },
          'Recording password changed event.',
        );

        span.setAttribute('auth.user.id', userId);

        span.setAttribute('auth.client.id', clientId);

        try {
          // =====================================================
          // Business logic
          // =====================================================

          await this.events.create({
            user: this.connectUser(userId),
            sessionId: null,
            client: this.connectClient(clientId),
            type: AuthenticationEventType.PASSWORD_CHANGED,
            authenticationMethod: AuthenticationMethod.PASSWORD,
            ipAddress,
            userAgent,
            failureReason: null,
          });

          // =====================================================
          // Observability
          // =====================================================

          this.passwordChangedCounter.add(1, {
            event_type: AuthenticationEventType.PASSWORD_CHANGED,
          });

          span.addEvent('auth.password.changed.recorded');

          this.logger.info(
            {
              userId,
            },
            'Password changed event recorded successfully.',
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              userId,
            },
            'Failed to record password changed event.',
          );

          throw error;
        }
      },
    );
  }

  // =====================================================
  // Private Helpers
  // =====================================================

  private async recordEvent(
    operation: string,
    type: AuthenticationEventType,
    data: Omit<Prisma.AuthenticationEventCreateInput, 'type'>,
    counter: CounterMetric,
    context: {
      userId?: string;
      clientId?: string;
      sessionId?: string;
    },
  ): Promise<void> {
    return withSpan(operation, async (span) => {
      this.logger.debug(
        {
          type,
          ...context,
        },
        'Recording authentication event.',
      );

      span.setAttribute('auth.event.type', type);

      if (context.userId) {
        span.setAttribute('auth.user.id', context.userId);
      }

      if (context.clientId) {
        span.setAttribute('auth.client.id', context.clientId);
      }

      if (context.sessionId) {
        span.setAttribute('auth.session.id', context.sessionId);
      }

      try {
        const event = await this.events.create({
          ...data,
          type,
        });

        span.setAttribute('auth.event.id', event.id);

        span.addEvent('auth.event.recorded');

        counter.add(1, {
          'auth.event.type': type,
        });

        this.logger.info(
          {
            eventId: event.id,
            type,
            ...context,
          },
          'Authentication event recorded.',
        );
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            type,
            ...context,
          },
          'Failed to record authentication event.',
        );

        throw error;
      }
    });
  }
}
