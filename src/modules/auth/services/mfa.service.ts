import { Injectable } from '@nestjs/common';
import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from '@pague-co-uk/sms-gateway-telemetry';
import { VerificationChannel, VerificationPurpose } from '@prisma/client';
import { RandomGenerator } from '../../../common/services/random.service.js';
import { SecretHasher } from '../../../common/services/secretHasher.service.js';
import { AppConfigService } from '../../../config/config.service.js';
import {
  InvalidVerificationCodeException,
  VerificationAttemptsExceededException,
  VerificationChallengeExpiredException,
  VerificationChallengeNotFoundException,
} from '../../../exceptions/auth/index.js';
import { VerificationChallengeRepository } from '../../../repositories/verificationChallengeRepository.js';

@Injectable()
export class MultiFactorAuthenticationService {
  private readonly logger = getComponentLogger(
    'MultiFactorAuthenticationService',
  );

  private readonly challengesCreatedCounter = createCounterMetric({
    name: 'auth.mfa.challenge.created',
    description: 'Number of created MFA verification challenges.',
  });

  private readonly successfulVerificationsCounter = createCounterMetric({
    name: 'auth.mfa.challenge.verification.success',
    description: 'Number of successful MFA challenge verifications.',
  });

  private readonly failedVerificationsCounter = createCounterMetric({
    name: 'auth.mfa.challenge.verification.failed',
    description: 'Number of failed MFA challenge verifications.',
  });

  constructor(
    private readonly config: AppConfigService,
    private readonly hasher: SecretHasher,
    private readonly random: RandomGenerator,
    private readonly challenges: VerificationChallengeRepository,
  ) { }

  async createChallenge(
    userId: string,
    purpose: VerificationPurpose,
    channel: VerificationChannel,
  ): Promise<{
    challengeId: string;
    code: string;
    expiresAt: Date;
  }> {
    return withSpan(
      'MultiFactorAuthenticationService.createChallenge',
      async (span) => {
        this.logger.info(
          { userId, purpose, channel },
          'Creating verification challenge.',
        );

        span.setAttributes({
          'user.id': userId,
          'verification.purpose': purpose,
          'verification.channel': channel,
        });

        try {
          await this.challenges.cancelPending(userId, purpose, channel);

          const code = this.generateCode();
          const codeHash = this.hasher.hash(code);

          const challenge = await this.challenges.create({
            user: {
              connect: {
                id: userId,
              },
            },
            codeHash,
            purpose,
            channel,
            expiresAt: this.calculateExpiry(),
          });

          this.challengesCreatedCounter.add(1);

          this.logger.info(
            { userId, purpose, channel },
            'Verification challenge created successfully.',
          );

          return {
            challengeId: challenge.id,
            code,
            expiresAt: challenge.expiresAt,
          };
        } catch (error) {
          recordException(error);

          this.logger.error(
            { error, userId, purpose, channel },
            'Failed to create verification challenge.',
          );

          throw error;
        }
      },
    );
  }

  async verifyChallenge(
    userId: string,
    purpose: VerificationPurpose,
    channel: VerificationChannel,
    code: string,
  ): Promise<void> {
    return withSpan(
      'MultiFactorAuthenticationService.verifyChallenge',
      async (span) => {
        this.logger.info(
          { userId, purpose, channel },
          'Verifying MFA challenge.',
        );

        span.setAttributes({
          'user.id': userId,
          'verification.purpose': purpose,
          'verification.channel': channel,
        });

        try {
          const challenge = await this.challenges.findPendingForUser(
            userId,
            purpose,
            channel,
          );

          if (!challenge) {
            throw new VerificationChallengeNotFoundException();
          }

          if (challenge.expiresAt <= new Date()) {
            await this.challenges.markExpired(challenge.id);

            throw new VerificationChallengeExpiredException();
          }

          const valid = this.hasher.verify(code, challenge.codeHash);

          if (!valid) {
            const updatedChallenge = await this.challenges.incrementAttempts(
              challenge.id,
            );

            this.logger.warn(
              {
                userId,
                purpose,
                channel,
                attempts: updatedChallenge.attempts,
              },
              'Invalid verification code.',
            );

            if (
              updatedChallenge.attempts >=
              this.config.auth.security.verification.maxAttempts
            ) {
              await this.challenges.markFailed(challenge.id);

              throw new VerificationAttemptsExceededException();
            }

            throw new InvalidVerificationCodeException();
          }

          await this.challenges.markVerified(challenge.id);

          this.successfulVerificationsCounter.add(1);

          this.logger.info(
            { userId, purpose, channel },
            'MFA challenge verified successfully.',
          );
        } catch (error) {
          this.failedVerificationsCounter.add(1);
          recordException(error);

          this.logger.error(
            { error, userId, purpose, channel },
            'Failed to verify MFA challenge.',
          );

          throw error;
        }
      },
    );
  }

  async cancelChallenge(
    userId: string,
    purpose: VerificationPurpose,
    channel: VerificationChannel,
  ): Promise<void> {
    return withSpan(
      'MultiFactorAuthenticationService.cancelChallenge',
      async (span) => {
        this.logger.info(
          { userId, purpose, channel },
          'Cancelling pending verification challenges.',
        );

        span.setAttributes({
          'user.id': userId,
          'verification.purpose': purpose,
          'verification.channel': channel,
        });

        try {
          await this.challenges.cancelPending(userId, purpose, channel);

          this.logger.info(
            { userId, purpose, channel },
            'Cancelled pending verification challenges.',
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            { error, userId, purpose, channel },
            'Failed to cancel pending verification challenges.',
          );

          throw error;
        }
      },
    );
  }

  async hasPendingChallenge(
    userId: string,
    purpose: VerificationPurpose,
    channel: VerificationChannel,
  ): Promise<boolean> {
    return withSpan(
      'MultiFactorAuthenticationService.hasPendingChallenge',
      async (span) => {
        this.logger.debug(
          { userId, purpose, channel },
          'Checking for pending verification challenge.',
        );

        span.setAttributes({
          'user.id': userId,
          'verification.purpose': purpose,
          'verification.channel': channel,
        });

        try {
          const hasPendingChallenge =
            (await this.challenges.findPendingForUser(
              userId,
              purpose,
              channel,
            )) !== null;

          this.logger.debug(
            { userId, purpose, channel, hasPendingChallenge },
            'Checked for pending verification challenge.',
          );

          return hasPendingChallenge;
        } catch (error) {
          recordException(error);

          this.logger.error(
            { error, userId, purpose, channel },
            'Failed to check for pending verification challenge.',
          );

          throw error;
        }
      },
    );
  }

  private generateCode(): string {
    const digits = this.config.auth.security.verification.codeLength;
    const min = 10 ** (digits - 1);
    const max = 10 ** digits;

    return this.random.integer(min, max).toString();
  }

  private calculateExpiry(): Date {
    const expiresAt = new Date();

    expiresAt.setMinutes(
      expiresAt.getMinutes() +
      this.config.auth.security.verification.expiryMinutes,
    );

    return expiresAt;
  }
}

// Retain the concise name used by the authentication facade.
export { MultiFactorAuthenticationService as MfaService };
