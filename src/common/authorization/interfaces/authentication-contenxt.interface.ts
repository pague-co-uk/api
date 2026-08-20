import { AuthenticationMethod } from "@prisma/client";

export interface AuthenticatedApiKey {
  readonly id: string;
  readonly publicId: string;
  readonly clientId: string;
  readonly name: string;
  readonly capabilities: readonly string[];
}

export interface AuthenticationContext {
  readonly method: AuthenticationMethod;
  readonly ipAddress: string;
  readonly userAgent: string;

  /**
   * Present only when the request was authenticated
   * using an API key.
   */
  readonly apiKey?: AuthenticatedApiKey;
}