export interface CreateSessionInput {
  userId: string;
  sessionTokenHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  trustedDeviceId?: string | null;
  authenticatedWithMfa: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
}
