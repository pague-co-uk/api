export interface LoginRequest {
  clientId: string;
  email: string;

  password: string;

  ipAddress: string;

  userAgent: string;
}