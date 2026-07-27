export interface LoginResponse {
  sessionId: string;

  sessionToken: string;

  refreshToken: string;

  refreshTokenExpiresAt: Date;
}