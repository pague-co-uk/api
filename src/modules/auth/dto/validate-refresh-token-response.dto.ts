export interface ValidatedRefreshToken {
  readonly id: string;

  readonly sessionId: string;

  readonly replacedById?: string | null;

  readonly expiresAt: Date;

  readonly revokedAt?: Date | null;
}