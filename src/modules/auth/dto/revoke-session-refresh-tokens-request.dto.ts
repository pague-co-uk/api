import { AuthenticationMethod } from "@prisma/client";

export interface RevokeSessionRefreshTokensRequest {
  readonly sessionId: string;

  readonly authenticationMethod: AuthenticationMethod;

  readonly userId: string;

  readonly clientId: string;

  readonly ipAddress?: string;

  readonly userAgent?: string;
}