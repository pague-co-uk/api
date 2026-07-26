import { AuthenticationMethod } from "@prisma/client";

export interface RevokeRefreshTokenRequest {
  readonly refreshTokenId: string;

  readonly authenticationMethod: AuthenticationMethod;

  readonly userId: string;

  readonly clientId: string;

  readonly sessionId: string;

  readonly ipAddress?: string;

  readonly userAgent?: string;
}