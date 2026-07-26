import { AuthenticationMethod } from "@prisma/client";

export interface AuthenticationEventRequest {
  readonly clientId: string;

  readonly userId: string;

  readonly ipAddress?: string;

  readonly userAgent?: string;

  readonly authenticationMethod: AuthenticationMethod;

  readonly sessionId?: string;

}