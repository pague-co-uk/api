export interface CreateSessionOptions {
  userId: string;

  ipAddress?: string;

  userAgent?: string;

  trustedDeviceId?: string;

  authenticatedWithMfa: boolean;
}