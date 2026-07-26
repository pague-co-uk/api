export interface CreateApiKeyRequest {
  clientId: string;

  name: string;

  expiresAt?: Date;

  createdByUserId: string;

  ipAddress?: string;

  userAgent?: string;
}