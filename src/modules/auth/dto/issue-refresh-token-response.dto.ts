export interface IssueRefreshTokenResponse {
  readonly refreshToken: string;

  readonly refreshTokenId: string;

  readonly expiresAt: Date;
}