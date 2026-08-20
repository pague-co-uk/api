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
  // -------------------------------------------------------------------------
  // Float
  // -------------------------------------------------------------------------

  [Permissions.FLOAT_READ]: {
    module: "float",
    description: "View client float balances and ledger entries.",
  },

  [Permissions.FLOAT_TOP_UP]: {
    module: "float",
    description: "Top up client float balances.",
  },

  [Permissions.FLOAT_DEBIT]: {
    module: "float",
    description: "Debit credits from client float balances.",
  },

  [Permissions.FLOAT_REFUND]: {
    module: "float",
    description: "Refund credits to client float balances.",
  },

  [Permissions.FLOAT_ADJUST]: {
    module: "float",
    description: "Adjust client float balances.",
  },
  // -------------------------------------------------------------------------
  // SMPP Accounts
  // -------------------------------------------------------------------------

  [Permissions.SMPP_ACCOUNTS_READ]: {
    module: "smpp_accounts",
    description: "View SMPP accounts.",
  },

  [Permissions.SMPP_ACCOUNTS_CREATE]: {
    module: "smpp_accounts",
    description: "Create SMPP accounts.",
  },

  [Permissions.SMPP_ACCOUNTS_UPDATE]: {
    module: "smpp_accounts",
    description: "Update SMPP account configuration.",
  },

  [Permissions.SMPP_ACCOUNTS_PASSWORD_UPDATE]: {
    module: "smpp_accounts",
    description: "Change SMPP account passwords.",
  },

  [Permissions.SMPP_ACCOUNTS_ACTIVATE]: {
    module: "smpp_accounts",
    description: "Activate SMPP accounts.",
  },

  [Permissions.SMPP_ACCOUNTS_DISABLE]: {
    module: "smpp_accounts",
    description: "Disable SMPP accounts.",
  },
  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------

  [Permissions.AUDIT_LOGS_READ]: {
    module: "audit_logs",
    description: "View audit logs.",
  },
  // -------------------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------------------

  [Permissions.MESSAGES_READ]: {
    module: "messages",
    description: "View messages.",
  },

  [Permissions.MESSAGES_CREATE]: {
    module: "messages",
    description: "Submit messages.",
  },
  // -------------------------------------------------------------------------
  // Webhooks
  // -------------------------------------------------------------------------
  [Permissions.WEBHOOKS_READ]: {
    module: "webhooks",
    description: "View webhook endpoints.",
  },

  [Permissions.WEBHOOKS_CREATE]: {
    module: "webhooks",
    description: "Create webhook endpoints.",
  },

  [Permissions.WEBHOOKS_UPDATE]: {
    module: "webhooks",
    description: "Update, enable, or disable webhook endpoints.",
  },

  [Permissions.WEBHOOKS_DELETE]: {
    module: "webhooks",
    description: "Delete webhook endpoints.",
  },

  [Permissions.WEBHOOKS_ROTATE_SECRET]: {
    module: "webhooks",
    description: "Rotate webhook signing secrets.",
  },
  [Permissions.WEBHOOKS_DELIVERIES_READ]: {
    module: "webhooks",
    description: "View webhook delivery history.",
  },
} as const;