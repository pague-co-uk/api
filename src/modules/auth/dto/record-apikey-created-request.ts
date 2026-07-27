import { AuthenticationMethod } from "@prisma/client";

export interface RecordApiKeyCreatedRequest {
  apiKeyId: string;
  publicId: string;
  prefix: string;
  clientId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  authenticationMethod: AuthenticationMethod
}