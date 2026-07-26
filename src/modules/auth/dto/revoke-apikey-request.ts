export interface RevokeApiKeyRequest {
  apiKeyId: string;

  revokedByUserId: string;

  ipAddress?: string;

  userAgent?: string;
}