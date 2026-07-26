export interface CreateVerificationChallengeResult {
  challengeId: string;
  code: string;
  expiresAt: Date;
}