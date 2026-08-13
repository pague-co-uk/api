import type { AuthenticatedPermission } from "./authenticated-permission.interface.js";

export interface AuthenticatedRole {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly permissions: readonly AuthenticatedPermission[];
}