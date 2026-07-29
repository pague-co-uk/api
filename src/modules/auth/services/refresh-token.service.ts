import { Injectable } from '@nestjs/common';
import {
  getComponentLogger,
  getMeter,
  recordException,
  withSpan,
} from '@pague-co-uk/sms-gateway-telemetry';

import { ClockService } from '../../../common/services/clock.service.js';
import { RandomGenerator } from '../../../common/services/random.service.js';
import { SecretHasher } from '../../../common/services/secretHasher.service.js';

import { AuthenticationMethod, RefreshToken } from '@prisma/client';
import { InvalidRefreshTokenException } from 'src/exceptions/invalid-refresh-token.exception.js';
import { RefreshTokenRepository } from '../repositories/refreshTokenRepository.js';
import { AuthenticationEventService } from './authentication-event.service.js';

interface IssueRefreshTokenResponse {
  refreshToken: string;
  refreshTokenId: string;
  expiresAt: Date;
}

interface RotateRefreshTokenResponse {
  refreshToken: string;
  refreshTokenId: string;
  expiresAt: Date;
}

interface ValidatedRefreshToken {
  id: string;
  sessionId: string;
  replacedById: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
}

@Injectable()
export class RefreshTokenService {
  // =====================================================
  // Logger
  // =====================================================

  private readonly logger = getComponentLogger(RefreshTokenService.name);

  // =====================================================
  // Metrics
  // =====================================================

  private readonly issuedCounter = getMeter().createCounter(
    'auth.refresh.issued',
    {
      description: 'Number of refresh tokens issued.',
    },
  );

  private readonly validatedCounter = getMeter().createCounter(
    'auth.refresh.validated',
    {
      description: 'Number of refresh tokens validated.',
    },
  );

  private readonly rotatedCounter = getMeter().createCounter(
    'auth.refresh.rotated',
    {
      description: 'Number of refresh tokens rotated.',
    },
  );

  private readonly revokedCounter = getMeter().createCounter(
    'auth.refresh.revoked',
    {
      description: 'Number of refresh tokens revoked.',
    },
  );

  private readonly sessionRevokedCounter = getMeter().createCounter(
    'auth.refresh.session.revoked',
    {
      description: 'Number of session refresh token revocations.',
    },
  );

  private readonly cleanupCounter = getMeter().createCounter(
    'auth.refresh.cleanup',
    {
      description: 'Number of expired refresh token cleanup operations.',
    },
  );

  // =====================================================
  // Constructor
  // =====================================================

  constructor(
    private readonly tokens: RefreshTokenRepository,
    private readonly events: AuthenticationEventService,
    private readonly hasher: SecretHasher,
    private readonly random: RandomGenerator,
    private readonly clock: ClockService,
  ) { }

  private generateRefreshToken(): string {
    return this.random.bytes(64).toString('base64url');
  }

  private hashRefreshToken(token: string): string {
    return this.hasher.hash(token);
  }

  private toValidatedRefreshToken(token: RefreshToken): ValidatedRefreshToken {
    return {
      id: token.id,
      sessionId: token.sessionId,
      replacedById: token.replacedById,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
    };
  }

  private isExpired(token: RefreshToken): boolean {
    return token.expiresAt <= this.clock.now();
  }

  private isRevoked(token: RefreshToken): boolean {
    return token.revokedAt !== null;
  }

  private ensureUsable(token: RefreshToken | null): RefreshToken {
    if (!token) {
      throw new InvalidRefreshTokenException('Refresh token not found.');
    }

    if (this.isRevoked(token)) {
      throw new InvalidRefreshTokenException('Refresh token has been revoked.');
    }

    if (this.isExpired(token)) {
      throw new InvalidRefreshTokenException('Refresh token has expired.');
    }

    return token;
  }

  async issue(
    sessionId: string,
    userId: string,
    clientId: string,
    expiresAt: Date,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<IssueRefreshTokenResponse> {
    return withSpan('RefreshTokenService.issue', async (span) => {
      this.logger.debug(
        {
          sessionId,
          userId,
          clientId,
        },
        'Issuing refresh token.',
      );

      span.setAttribute('auth.session.id', sessionId);

      span.setAttribute('auth.user.id', userId);

      span.setAttribute('auth.client.id', clientId);

      try {
        const refreshToken = this.generateRefreshToken();

        const tokenHash = await this.hashRefreshToken(refreshToken);

        const token = await this.tokens.create({
          tokenHash,
          expiresAt,
          session: {
            connect: {
              id: sessionId,
            },
          },
        });

        await this.events.recordRefreshTokenIssued(
          userId,
          sessionId,
          clientId,
          authenticationMethod,
          ipAddress,
          userAgent,
        );

        this.issuedCounter.add(1);

        span.setAttribute('auth.refresh.id', token.id);

        span.addEvent('auth.refresh.issued', {
          'auth.refresh.id': token.id,
        });

        this.logger.info(
          {
            refreshTokenId: token.id,
            sessionId,
            userId,
            clientId,
          },
          'Refresh token issued.',
        );

        return {
          refreshToken,
          refreshTokenId: token.id,
          expiresAt: token.expiresAt,
        };
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            sessionId,
            userId,
            clientId,
          },
          'Failed to issue refresh token.',
        );

        throw error;
      }
    });
  }

  async validate(refreshToken: string): Promise<ValidatedRefreshToken> {
    return withSpan('RefreshTokenService.validate', async (span) => {
      this.logger.debug('Validating refresh token.');

      try {
        const tokenHash = await this.hashRefreshToken(refreshToken);

        const token = await this.tokens.findByHash(tokenHash);

        const validated = this.ensureUsable(token);

        this.validatedCounter.add(1);

        span.setAttribute('auth.refresh.id', validated.id);

        span.setAttribute('auth.session.id', validated.sessionId);

        span.addEvent('auth.refresh.validated', {
          'auth.refresh.id': validated.id,
        });

        this.logger.debug(
          {
            refreshTokenId: validated.id,
            sessionId: validated.sessionId,
          },
          'Refresh token validated.',
        );

        return this.toValidatedRefreshToken(validated);
      } catch (error) {
        recordException(error);

        this.logger.warn(
          {
            error,
          },
          'Refresh token validation failed.',
        );

        throw error;
      }
    });
  }

  async revoke(
    refreshTokenId: string,
    sessionId: string,
    userId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return withSpan('RefreshTokenService.revoke', async (span) => {
      this.logger.debug(
        {
          refreshTokenId,
          sessionId,
          userId,
          clientId,
        },
        'Revoking refresh token.',
      );

      span.setAttribute('auth.refresh.id', refreshTokenId);

      span.setAttribute('auth.session.id', sessionId);

      try {
        const token = await this.tokens.findById(refreshTokenId);

        if (!token || this.isRevoked(token)) {
          this.logger.debug(
            {
              refreshTokenId,
            },
            'Refresh token already revoked.',
          );

          return;
        }

        await this.tokens.revoke(token.id, this.clock.now());

        await this.events.recordRefreshTokenRevoked(
          userId,
          sessionId,
          clientId,
          authenticationMethod,
          ipAddress,
          userAgent,
        );

        this.revokedCounter.add(1);

        span.addEvent('auth.refresh.revoked', {
          'auth.refresh.id': token.id,
        });

        this.logger.info(
          {
            refreshTokenId: token.id,
            sessionId,
          },
          'Refresh token revoked.',
        );
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            refreshTokenId,
          },
          'Failed to revoke refresh token.',
        );

        throw error;
      }
    });
  }

  async revokeSessionRefreshTokens(
    sessionId: string,
    userId: string,
    clientId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return withSpan('RefreshTokenService.revokeSession', async (span) => {
      this.logger.debug(
        {
          sessionId,
          userId,
          clientId,
        },
        'Revoking session refresh tokens.',
      );

      span.setAttribute('auth.session.id', sessionId);

      try {
        await this.tokens.revokeBySession(sessionId, this.clock.now());

        await this.events.recordSessionRevoked(
          userId,
          sessionId,
          clientId,
          authenticationMethod,
          ipAddress,
          userAgent,
        );

        this.sessionRevokedCounter.add(1);

        span.addEvent('auth.session.refresh-tokens.revoked', {
          'auth.session.id': sessionId,
        });

        this.logger.info(
          {
            sessionId,
            userId,
            clientId,
          },
          'Session refresh tokens revoked.',
        );
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            sessionId,
          },
          'Failed to revoke session refresh tokens.',
        );

        throw error;
      }
    });
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    return withSpan(
      'RefreshTokenService.revokeUserRefreshTokens',
      async (span) => {
        this.logger.debug({ userId }, 'Revoking user refresh tokens.');

        span.setAttribute('auth.user.id', userId);

        try {
          await this.tokens.revokeByUser(userId, this.clock.now());

          this.sessionRevokedCounter.add(1);

          span.addEvent('auth.user.refresh-tokens.revoked');

          this.logger.info({ userId }, 'User refresh tokens revoked.');
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              userId,
            },
            'Failed to revoke user refresh tokens.',
          );

          throw error;
        }
      },
    );
  }

  async rotate(
    refreshToken: string,
    sessionId: string,
    userId: string,
    clientId: string,
    expiresAt: Date,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<RotateRefreshTokenResponse> {
    return withSpan('RefreshTokenService.rotate', async (span) => {
      this.logger.debug(
        {
          sessionId,
          userId,
          clientId,
        },
        'Rotating refresh token.',
      );

      span.setAttribute('auth.session.id', sessionId);

      try {
        const currentTokenHash = this.hashRefreshToken(refreshToken);

        const newRefreshToken = this.generateRefreshToken();

        const newTokenHash = this.hashRefreshToken(newRefreshToken);

        const { previousToken, newToken } = await this.tokens.withTransaction(
          async (tx) => {
            const tokens = this.tokens.withDatabase(tx);

            const events = this.events.withDatabase(tx);

            const currentToken = this.ensureUsable(
              await tokens.findByHash(currentTokenHash),
            );

            const created = await tokens.create({
              session: {
                connect: {
                  id: currentToken.sessionId,
                },
              },
              tokenHash: newTokenHash,
              expiresAt,
            });

            await tokens.replace(currentToken.id, created.id, this.clock.now());

            await events.recordRefreshTokenRotated(
              userId,
              currentToken.sessionId,
              clientId,
              authenticationMethod,
              ipAddress,
              userAgent,
            );

            return {
              previousToken: currentToken,
              newToken: created,
            };
          },
        );

        this.rotatedCounter.add(1);

        span.setAttribute('auth.refresh.id', newToken.id);

        span.addEvent('auth.refresh.rotated', {
          'auth.refresh.id': newToken.id,
          'auth.refresh.previous.id': previousToken.id,
        });

        this.logger.info(
          {
            previousRefreshTokenId: previousToken.id,
            refreshTokenId: newToken.id,
            sessionId: previousToken.sessionId,
          },
          'Refresh token rotated.',
        );

        return {
          refreshToken: newRefreshToken,
          refreshTokenId: newToken.id,
          expiresAt: newToken.expiresAt,
        };
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            sessionId,
          },
          'Failed to rotate refresh token.',
        );

        throw error;
      }
    });
  }
}
