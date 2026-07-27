export interface LoginRequest {
  username: string;

  password: string;

  ipAddress: string;

  userAgent: string;

  clientId: string;

  trustedDeviceId?: string | null;
}