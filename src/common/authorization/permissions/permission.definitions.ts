import type { PermissionName } from "./permissions.registry.js";
import { Permissions } from "./permissions.registry.js";

export interface PermissionDefinition {
  readonly module: string;
  readonly description: string;
}

export const PermissionDefinitions: {
  readonly [P in PermissionName]: PermissionDefinition;
} = {
  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  [Permissions.USERS_READ]: {
    module: "users",
    description: "View users.",
  },

  [Permissions.USERS_CREATE]: {
    module: "users",
    description: "Create users.",
  },

  [Permissions.USERS_UPDATE]: {
    module: "users",
    description: "Update users.",
  },

  [Permissions.USERS_DELETE]: {
    module: "users",
    description: "Delete users.",
  },

  [Permissions.USERS_ACTIVATE]: {
    module: "users",
    description: "Activate users.",
  },

  [Permissions.USERS_DEACTIVATE]: {
    module: "users",
    description: "Deactivate users.",
  },

  [Permissions.USERS_UNLOCK]: {
    module: "users",
    description: "Unlock users.",
  },

  [Permissions.USERS_ROLES_UPDATE]: {
    module: "users",
    description: "Replace a user's role assignments.",
  },

  // -------------------------------------------------------------------------
  // Permissions
  // -------------------------------------------------------------------------

  [Permissions.PERMISSIONS_READ]: {
    module: "permissions",
    description: "View permissions.",
  },

  // -------------------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------------------

  [Permissions.ROLES_READ]: {
    module: "roles",
    description: "View roles.",
  },

  [Permissions.ROLES_CREATE]: {
    module: "roles",
    description: "Create roles.",
  },

  [Permissions.ROLES_UPDATE]: {
    module: "roles",
    description: "Update roles.",
  },

  [Permissions.ROLES_DELETE]: {
    module: "roles",
    description: "Delete roles.",
  },

  // -------------------------------------------------------------------------
  // Clients
  // -------------------------------------------------------------------------

  [Permissions.CLIENTS_READ]: {
    module: "clients",
    description: "View clients.",
  },

  [Permissions.CLIENTS_CREATE]: {
    module: "clients",
    description: "Create clients.",
  },

  [Permissions.CLIENTS_UPDATE]: {
    module: "clients",
    description: "Update clients.",
  },

  [Permissions.CLIENTS_DELETE]: {
    module: "clients",
    description: "Delete clients.",
  },

  [Permissions.CLIENTS_ACTIVATE]: {
    module: "clients",
    description: "Activate clients.",
  },

  [Permissions.CLIENTS_SUSPEND]: {
    module: "clients",
    description: "Suspend clients.",
  },

  [Permissions.CLIENTS_DISABLE]: {
    module: "clients",
    description: "Disable clients.",
  },

  // -------------------------------------------------------------------------
  // Sender IDs
  // -------------------------------------------------------------------------

  [Permissions.SENDER_IDS_READ]: {
    module: "sender_ids",
    description: "View Sender IDs.",
  },

  [Permissions.SENDER_IDS_CREATE]: {
    module: "sender_ids",
    description: "Create Sender IDs.",
  },

  [Permissions.SENDER_IDS_UPDATE]: {
    module: "sender_ids",
    description: "Update Sender IDs.",
  },

  [Permissions.SENDER_IDS_DELETE]: {
    module: "sender_ids",
    description: "Delete Sender IDs.",
  },

  [Permissions.SENDER_IDS_APPROVE]: {
    module: "sender_ids",
    description: "Approve Sender IDs.",
  },

  [Permissions.SENDER_IDS_REJECT]: {
    module: "sender_ids",
    description: "Reject Sender IDs.",
  },

  [Permissions.SENDER_IDS_DISABLE]: {
    module: "sender_ids",
    description: "Disable Sender IDs.",
  },

  [Permissions.SENDER_IDS_DEFAULT_UPDATE]: {
    module: "sender_ids",
    description: "Change the default Sender ID.",
  },

  // -------------------------------------------------------------------------
  // API Keys
  // -------------------------------------------------------------------------

  [Permissions.API_KEYS_READ]: {
    module: "api_keys",
    description: "View API keys.",
  },

  [Permissions.API_KEYS_CREATE]: {
    module: "api_keys",
    description: "Create API keys.",
  },

  [Permissions.API_KEYS_REVOKE]: {
    module: "api_keys",
    description: "Revoke API keys.",
  },
} as const;