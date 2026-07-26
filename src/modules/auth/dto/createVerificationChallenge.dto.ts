import { VerificationChannel, VerificationPurpose } from "@prisma/client";

export interface CreateVerificationChallengeDto {
  userId: string;
  purpose: VerificationPurpose;
  channel: VerificationChannel;
}