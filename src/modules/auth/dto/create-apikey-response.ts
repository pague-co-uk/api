export interface CreateApiKeyResponse {
  apiKeyId: string;

  publicId: string;

  apiKey: string;

  prefix: string;

  expiresAt: Date | null;
}