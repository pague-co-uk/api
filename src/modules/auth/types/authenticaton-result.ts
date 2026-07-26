export interface AuthenticationResult {
  accessToken: string;

  accessTokenExpiresAt: Date;

  refreshToken: string;

  refreshTokenExpiresAt: Date;

  sessionId: string;
}