import { ApiKeyStatus } from "@prisma/client";

export interface ValidatedApiKey {
  id: string;

  publicId: string;

  clientId: string;

  name: string;

  status: ApiKeyStatus;

  expiresAt: Date | null;

  lastUsedAt: Date | null;
}