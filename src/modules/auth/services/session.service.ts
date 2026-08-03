import { Injectable } from '@nestjs/common';
import {
  createCounter,
  getComponentLogger,
  recordException,
  withSpan,
} from '@pague-co-uk/sms-gateway-telemetry';
import { PortalSession } from '@prisma/client';
import { ClockService } from '../../../common/services/clock.service.js';
import { RandomGenerator } from '../../../common/services/random.service.js';
import { SecretHasher } from '../../../common/services/secretHasher.service.js';
import { AppConfigService } from '../../../config/config.service.js';
import { SessionValidationFailureReason } from '../enums/session-validation-failure-reason.enum.js';
import { SessionRepository } from '../repositories/sessionRepository.js';
import { SessionToken } from '../utils/sessionToken.js';

type CreateSessionResult = {
  token: string;
  session: PortalSession;
};

type SessionValidationResult =
  | {
    valid: true;
    session: PortalSession;
  }
  | {
    valid: false;
    reason: SessionValidationFailureReason;
  };

@Injectable()
export class SessionService {
  constructor(
    private readonly config: AppConfigService,
    private readonly clock: ClockService,
    private readonly random: RandomGenerator,
    private readonly secretHasher: SecretHasher,
    private readonly repository: SessionRepository,
  ) { }
  private readonly logger = getComponentLogger(SessionService.name);

  private readonly sessionsCreatedCounter = createCounter(
    'auth.sessions.created',
    {
      description: 'Number of authenticated sessions created.',
    },
  );

  private readonly sessionsValidatedCounter = createCounter(
    'auth.sessions.validated',
    {
      description: 'Number of successful session validations.',
    },
  );

  private readonly sessionsValidationFailedCounter = createCounter(
    'auth.sessions.validation.failed',
    {
      description: 'Number of failed session validations.',
    },
  );

  private readonly sessionsTouchedCounter = createCounter(
    'auth.sessions.touched',
    {
      description: 'Number of session activity updates.',
    },
  );

  private readonly sessionsRevokedCounter = createCounter(
    'auth.sessions.revoked',
    {
      description: 'Number of sessions revoked.',
    },
  );

  private readonly sessionsRevokedAllCounter = createCounter(
    'auth.sessions.revoked_all',
    {
      description: 'Number of users whose sessions were revoked.',
    },
  );

  /**
   * Creates a new authenticated session.
   *
   * Flow:
   *  - Generate session token
   *  - Hash token
   *  - Compute expiry
   *  - Persist session
   *  - Return plaintext token once
   */
  async createSession(
    userId: string,
    ipAddress?: string | null,
    userAgent?: string | null,
    trustedDeviceId?: string | null,
    authenticatedWithMfa = false,
  ): Promise<CreateSessionResult> {
    return withSpan('SessionService.createSession', async (span) => {
      span.setAttribute('auth.user.id', userId);

      span.setAttribute('auth.session.mfa', authenticatedWithMfa);

      this.logger.debug(
        {
          userId,
          authenticatedWithMfa,
        },
        'Creating authenticated session.',
      );

      try {
        // =====================================================
        // Business logic
        // =====================================================

        const token = SessionToken.generate(this.random);

        const tokenHash = token.hash(this.secretHasher);

        const now = this.clock.now();

        const expiresAt = new Date(now);

        expiresAt.setDate(
          expiresAt.getDate() +
          this.config.auth.security.session.absoluteTimeoutDays,
        );

        span.addEvent('session.persisting');

        const session = await this.repository.create({
          userId,
          sessionTokenHash: tokenHash,
          ipAddress,
          userAgent,
          trustedDeviceId,
          authenticatedWithMfa,
          lastActivityAt: now,
          expiresAt,
        });

        // =====================================================
        // Observability
        // =====================================================

        span.setAttribute('auth.session.id', session.id);

        span.setAttribute('auth.session.expires_at', expiresAt.toISOString());

        span.addEvent('session.created', {
          'auth.session.id': session.id,
        });

        this.sessionsCreatedCounter.add(1, {
          'auth.session.mfa': String(authenticatedWithMfa),
        });

        this.logger.info(
          {
            sessionId: session.id,
            userId: session.userId,
            expiresAt,
          },
          'Authenticated session created.',
        );

        return {
          token: token.toString(),
          session,
        };
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            userId,
          },
          'Failed to create authenticated session.',
        );

        throw error;
      }
    });
  }
  /**
   * Validates a session token.
   *
   * Does NOT modify the session.
   */
  async validateSession(token: string): Promise<SessionValidationResult> {
    return withSpan('SessionService.validateSession', async (span) => {
      this.logger.debug(
        {
          hasToken: Boolean(token),
        },
        'Validating authenticated session.',
      );

      const invalid = (
        reason: SessionValidationFailureReason,
      ): SessionValidationResult => {
        span.setAttribute('auth.validation.reason', reason);

        span.addEvent('auth.session.validation.failed', {
          'auth.validation.reason': reason,
        });

        this.sessionsValidationFailedCounter.add(1, {
          reason,
        });

        this.logger.warn(
          {
            reason,
          },
          'Session validation failed.',
        );

        return {
          valid: false,
          reason,
        };
      };

      try {
        // =====================================================
        // Business logic
        // =====================================================

        let sessionToken: SessionToken;

        try {
          sessionToken = SessionToken.parse(token);
        } catch {
          return invalid(SessionValidationFailureReason.INVALID_TOKEN);
        }

        const tokenHash = sessionToken.hash(this.secretHasher);

        const session = await this.repository.findByTokenHash(tokenHash);

        if (!session) {
          return invalid(SessionValidationFailureReason.INVALID_TOKEN);
        }

        if (session.revokedAt) {
          return invalid(SessionValidationFailureReason.REVOKED);
        }

        const now = this.clock.now();

        if (session.expiresAt <= now) {
          return invalid(SessionValidationFailureReason.EXPIRED);
        }

        const idleExpiry = new Date(session.lastActivityAt.getTime());

        idleExpiry.setMinutes(
          idleExpiry.getMinutes() +
          this.config.auth.security.session.idleTimeoutMinutes,
        );

        if (idleExpiry <= now) {
          return invalid(SessionValidationFailureReason.IDLE_TIMEOUT);
        }

        // =====================================================
        // Observability
        // =====================================================

        span.setAttribute('auth.validation.result', 'VALID');

        span.setAttribute('auth.user.id', session.userId);

        span.setAttribute('auth.session.id', session.id);

        span.setAttribute(
          'auth.session.authenticated_with_mfa',
          session.authenticatedWithMfa,
        );

        span.addEvent('auth.session.validated', {
          'auth.session.id': session.id,
        });

        this.sessionsValidatedCounter.add(1, {
          authenticated_with_mfa: String(session.authenticatedWithMfa),
        });

        this.logger.debug(
          {
            sessionId: session.id,
            userId: session.userId,
          },
          'Authenticated session validated.',
        );

        return {
          valid: true,
          session,
        };
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
          },
          'Failed to validate authenticated session.',
        );

        throw error;
      }
    });
  }

  /**
   * Updates the session activity timestamp.
   */
  async touchSession(sessionId: string): Promise<void> {
    return withSpan('SessionService.touchSession', async (span) => {
      span.setAttribute('auth.session.id', sessionId);

      this.logger.debug(
        {
          sessionId,
        },
        'Updating session activity.',
      );

      try {
        // =====================================================
        // Business logic
        // =====================================================

        const now = this.clock.now();

        const session = await this.repository.findById(sessionId);

        if (!session) {
          span.addEvent('auth.session.touch.skipped', {
            reason: 'NOT_FOUND',
          });

          return;
        }

        if (session.revokedAt) {
          span.addEvent('auth.session.touch.skipped', {
            reason: 'REVOKED',
          });

          return;
        }

        if (session.expiresAt <= now) {
          span.addEvent('auth.session.touch.skipped', {
            reason: 'EXPIRED',
          });

          return;
        }

        await this.repository.updateActivity(session.id, now);

        // =====================================================
        // Observability
        // =====================================================

        span.addEvent('auth.session.touched', {
          'auth.session.id': session.id,
        });

        this.sessionsTouchedCounter.add(1);

        this.logger.debug(
          {
            sessionId: session.id,
            userId: session.userId,
          },
          'Session activity updated.',
        );
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            sessionId,
          },
          'Failed to update session activity.',
        );

        throw error;
      }
    });
  }

  /**
   * Revokes a single session.
   */
  async revokeSession(sessionId: string): Promise<void> {
    return withSpan('SessionService.revokeSession', async (span) => {
      span.setAttribute('auth.session.id', sessionId);

      this.logger.debug(
        {
          sessionId,
        },
        'Revoking authenticated session.',
      );

      try {
        // =====================================================
        // Business logic
        // =====================================================

        const session = await this.repository.findById(sessionId);

        if (!session) {
          span.addEvent('auth.session.revoke.skipped', {
            reason: 'NOT_FOUND',
          });

          return;
        }

        if (session.revokedAt) {
          span.addEvent('auth.session.revoke.skipped', {
            reason: 'ALREADY_REVOKED',
          });

          return;
        }

        const revokedAt = this.clock.now();

        await this.repository.revoke(session.id, revokedAt);

        // =====================================================
        // Observability
        // =====================================================

        span.setAttribute('auth.user.id', session.userId);

        span.addEvent('auth.session.revoked', {
          'auth.session.id': session.id,
        });

        this.sessionsRevokedCounter.add(1);

        this.logger.info(
          {
            sessionId: session.id,
            userId: session.userId,
            revokedAt,
          },
          'Authenticated session revoked.',
        );
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            sessionId,
          },
          'Failed to revoke authenticated session.',
        );

        throw error;
      }
    });
  }

  /**
   * Revokes every session belonging to a user.
   */
  async revokeAllSessions(userId: string): Promise<number> {
    return withSpan('SessionService.revokeAllSessions', async (span) => {
      span.setAttribute('auth.user.id', userId);

      this.logger.info(
        {
          userId,
        },
        'Revoking all authenticated sessions.',
      );

      try {
        // =====================================================
        // Business logic
        // =====================================================

        const revokedAt = this.clock.now();

        const result = await this.repository.revokeAllForUser(
          userId,
          revokedAt,
        );

        // =====================================================
        // Observability
        // =====================================================

        span.setAttribute('auth.sessions.revoked.count', result.count);

        span.addEvent('auth.sessions.revoked_all', {
          'auth.user.id': userId,
          'auth.sessions.revoked.count': result.count,
        });

        this.sessionsRevokedAllCounter.add(1);

        this.logger.info(
          {
            userId,
            revokedCount: result.count,
            revokedAt,
          },
          'All authenticated sessions revoked.',
        );

        return result.count;
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            userId,
          },
          'Failed to revoke authenticated sessions.',
        );

        throw error;
      }
    });
  }
}
