import { AuthenticationMethod } from "@prisma/client";

export interface RotateApiKeyRequest {
  apiKey: string;

  rotatedByUserId: string;

  ipAddress?: string;

  userAgent?: string;

  clientId: string;
  userId: string;
  authenticationMethod: AuthenticationMethod;
}