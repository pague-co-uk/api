export interface RotateRefreshTokenResponse {
  readonly refreshToken: string;

  readonly refreshTokenId: string;

  readonly expiresAt: Date;
}