export interface RefreshRequest {
  refreshToken: string;

  clientId: string;

  ipAddress: string;

  userAgent: string;
}