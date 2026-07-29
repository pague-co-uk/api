import { randomInt } from "node:crypto";

import { Injectable } from "@nestjs/common";
import {
  VerificationChannel,
  VerificationPurpose,
} from "@prisma/client";
import { addMinutes } from "date-fns";

import { ClockService } from "../../../common/services/clock.service.js";
import { AppConfigService } from "../../../config/config.service.js";

import { CreateVerificationChallengeResult } from "../enums/createVerificationChallengeResult.js";
import { VerificationChallengeRepository } from "../repositories/verificationChallengeRepository.js";
import { PasswordService } from "./password.service.js";

export enum VerificationResult {
  VERIFIED,
  INVALID_CODE,
  EXPIRED,
  TOO_MANY_ATTEMPTS,
  NOT_FOUND,
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly config: AppConfigService,
    private readonly clock: ClockService,
    private readonly passwordService: PasswordService,
    private readonly verificationChallengeRepository: VerificationChallengeRepository,
  ) { }

  async createChallenge(
    userId: string,
    purpose: VerificationPurpose,
    channel: VerificationChannel,
  ): Promise<CreateVerificationChallengeResult> {
    await this.verificationChallengeRepository.cancelPending(
      userId,
      purpose,
      channel,
    );

    const code = this.generateCode();

    const codeHash =
      await this.passwordService.hash(code);

    const expiresAt =
      this.calculateExpiry();

    const challenge =
      await this.verificationChallengeRepository.create({
        user: {
          connect: {
            id: userId,
          },
        },
        purpose,
        channel,
        codeHash,
        expiresAt,
        attempts: 0,
      });

    return {
      challengeId: challenge.id,
      code,
      expiresAt,
    };
  }

  async verifyChallenge(
    userId: string,
    purpose: VerificationPurpose,
    channel: VerificationChannel,
    code: string,
  ): Promise<VerificationResult> {
    const challenge =
      await this.verificationChallengeRepository.findPending(
        userId,
        purpose,
        channel,
      );

    if (!challenge) {
      return VerificationResult.NOT_FOUND;
    }

    if (this.clock.isPast(challenge.expiresAt)) {
      await this.verificationChallengeRepository.markExpired(
        challenge.id,
      );

      return VerificationResult.EXPIRED;
    }

    if (
      challenge.attempts >=
      this.config.auth.security.verification.maxAttempts
    ) {
      await this.verificationChallengeRepository.markFailed(
        challenge.id,
      );

      return VerificationResult.TOO_MANY_ATTEMPTS;
    }

    const valid =
      await this.passwordService.verify(
        challenge.codeHash,
        code,
      );

    if (!valid) {
      await this.verificationChallengeRepository.incrementAttempts(
        challenge.id,
      );

      return VerificationResult.INVALID_CODE;
    }

    await this.verificationChallengeRepository.markVerified(
      challenge.id,
    );

    return VerificationResult.VERIFIED;
  }

  private generateCode(): string {
    const {
      codeLength,
    } = this.config.auth.security.verification;

    const min = 10 ** (codeLength - 1);
    const max = 10 ** codeLength;

    return randomInt(
      min,
      max,
    ).toString();
  }

  private calculateExpiry(): Date {
    return addMinutes(
      this.clock.now(),
      this.config.auth.security.verification.expiryMinutes,
    );
  }
}
