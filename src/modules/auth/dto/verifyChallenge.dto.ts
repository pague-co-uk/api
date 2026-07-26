import { VerificationChannel, VerificationPurpose } from "@prisma/client";

export interface VerifyChallengeDto {
  userId: string;
  purpose: VerificationPurpose;
  channel: VerificationChannel;
  code: string;
}