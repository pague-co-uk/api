import type { PermissionName } from "./permissions.registry.js";

export interface PermissionDefinition {
  readonly name: PermissionName;
  readonly module: string;
  readonly description: string;
}