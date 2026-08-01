export interface VerificationChallenge {
  userId: string;

  expiresAt: Date;

  consumedAt?: Date;
}