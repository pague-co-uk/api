import { AuthenticationMethod } from "@prisma/client";

export interface RevokeApiKeyRequest {
  apiKey: string;

  revokedByUserId: string;

  ipAddress?: string;

  userAgent?: string;
  clientId: string;
  userId: string;
  authenticationMethod: AuthenticationMethod;
}