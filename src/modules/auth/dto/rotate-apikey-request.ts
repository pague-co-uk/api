export interface RotateApiKeyRequest {
  apiKeyId: string;

  rotatedByUserId: string;

  ipAddress?: string;

  userAgent?: string;
}