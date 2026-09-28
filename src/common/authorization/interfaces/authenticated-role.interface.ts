import type { AuthenticatedPermission } from "./authenticated-permission.interface.js";

export interface AuthenticatedRole {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly priority: number;
  readonly permissions: readonly AuthenticatedPermission[];
}