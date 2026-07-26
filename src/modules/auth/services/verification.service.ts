import { randomInt } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { addMinutes } from "date-fns";

import { ClockService } from "../../../common/clock.service.js";
import { AppConfigService } from "../../../config/config.service.js";

import type {
  CreateVerificationChallengeDto,
  CreateVerificationChallengeResult,
} from "../dto/index.js";
import { VerifyChallengeDto } from "../dto/verifyChallenge.dto.js";
import { VerificationResult } from "../dto/verifyChallengeResult.dto.js";

import { VerificationChallengeRepository } from "../repositories/verificationChallengeRepository.js";
import { PasswordService } from "./password.service.js";

@Injectable()
export class VerificationService {
  constructor(
    private readonly config: AppConfigService,
    private readonly clock: ClockService,
    private readonly passwordService: PasswordService,
    private readonly verificationChallengeRepository: VerificationChallengeRepository,
  ) { }

  async createChallenge(
    dto: CreateVerificationChallengeDto,
  ): Promise<CreateVerificationChallengeResult> {
    const verificationConfig =
      this.config.security.verification;

    await this.verificationChallengeRepository.cancelPending(
      dto.userId,
      dto.purpose,
      dto.channel,
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
            id: dto.userId,
          },
        },
        purpose: dto.purpose,
        channel: dto.channel,
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
    dto: VerifyChallengeDto,
  ): Promise<VerificationResult> {
    const challenge =
      await this.verificationChallengeRepository.findPending(
        dto.userId,
        dto.purpose,
        dto.channel,
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
      this.config.security.verification.maxAttempts
    ) {
      await this.verificationChallengeRepository.markFailed(
        challenge.id,
      );

      return VerificationResult.TOO_MANY_ATTEMPTS;
    }

    const valid =
      await this.passwordService.verify(
        challenge.codeHash,
        dto.code,
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
    } = this.config.security.verification;

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
      this.config.security.verification.expiryMinutes,
    );
  }
}