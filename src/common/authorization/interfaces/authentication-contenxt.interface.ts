import { AuthenticationMethod } from "@prisma/client";

export interface AuthenticationContext {
  readonly method: AuthenticationMethod;
  readonly ipAddress: string;
  readonly userAgent: string;
}