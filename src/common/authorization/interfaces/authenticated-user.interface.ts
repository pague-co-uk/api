import type { AuthenticatedRole } from "./authenticated-role.interface.js";

export interface AuthenticatedUser {
  readonly sessionId: string;
  readonly userId: string;
  readonly clientId: string;

  readonly username: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;

  readonly active: boolean;
  readonly locked: boolean;
  readonly mfaEnabled: boolean;

  readonly roles: readonly AuthenticatedRole[];
}