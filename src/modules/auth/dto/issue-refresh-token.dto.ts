import { AuthenticationMethod } from "@prisma/client";

export interface IssueRefreshTokenRequest {
  readonly sessionId: string;

  readonly authenticationMethod: AuthenticationMethod;

  readonly userId: string;

  readonly clientId: string;

  readonly expiresAt: Date;

  readonly ipAddress?: string;

  readonly userAgent?: string;
}