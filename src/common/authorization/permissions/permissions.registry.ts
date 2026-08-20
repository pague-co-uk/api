export const Permissions = {
  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  USERS_ACTIVATE: "users.activate",
  USERS_DEACTIVATE: "users.deactivate",
  USERS_UNLOCK: "users.unlock",
  USERS_ROLES_UPDATE: "users.roles.update",

  // -------------------------------------------------------------------------
  // Permissions
  // -------------------------------------------------------------------------

  PERMISSIONS_READ: "permissions.read",

  // -------------------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------------------

  ROLES_READ: "roles.read",
  ROLES_CREATE: "roles.create",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",

  // -------------------------------------------------------------------------
  // Clients
  // -------------------------------------------------------------------------

  CLIENTS_READ: "clients.read",
  CLIENTS_CREATE: "clients.create",
  CLIENTS_UPDATE: "clients.update",
  CLIENTS_DELETE: "clients.delete",
  CLIENTS_ACTIVATE: "clients.activate",
  CLIENTS_SUSPEND: "clients.suspend",
  CLIENTS_DISABLE: "clients.disable",

  // -------------------------------------------------------------------------
  // Sender IDs
  // -------------------------------------------------------------------------

  SENDER_IDS_READ: "sender_ids.read",
  SENDER_IDS_CREATE: "sender_ids.create",
  SENDER_IDS_UPDATE: "sender_ids.update",
  SENDER_IDS_DELETE: "sender_ids.delete",
  SENDER_IDS_APPROVE: "sender_ids.approve",
  SENDER_IDS_REJECT: "sender_ids.reject",
  SENDER_IDS_DISABLE: "sender_ids.disable",
  SENDER_IDS_DEFAULT_UPDATE: "sender_ids.default.update",

  // -------------------------------------------------------------------------
  // API Keys
  // -------------------------------------------------------------------------

  API_KEYS_READ: "api_keys.read",
  API_KEYS_CREATE: "api_keys.create",
  API_KEYS_REVOKE: "api_keys.revoke",

  // -------------------------------------------------------------------------
  // Float
  // -------------------------------------------------------------------------

  FLOAT_READ: "float.read",
  FLOAT_TOP_UP: "float.top_up",
  FLOAT_DEBIT: "float.debit",
  FLOAT_REFUND: "float.refund",
  FLOAT_ADJUST: "float.adjust",

  // -------------------------------------------------------------------------
  // SMPP Accounts
  // -------------------------------------------------------------------------

  SMPP_ACCOUNTS_READ: "smpp_accounts.read",
  SMPP_ACCOUNTS_CREATE: "smpp_accounts.create",
  SMPP_ACCOUNTS_UPDATE: "smpp_accounts.update",
  SMPP_ACCOUNTS_PASSWORD_UPDATE: "smpp_accounts.password.update",
  SMPP_ACCOUNTS_ACTIVATE: "smpp_accounts.activate",
  SMPP_ACCOUNTS_DISABLE: "smpp_accounts.disable",

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------

  AUDIT_LOGS_READ: "audit_logs.read",

  // -------------------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------------------

  MESSAGES_READ: "messages.read",
  MESSAGES_CREATE: "messages.create",

  // -------------------------------------------------------------------------
  // Webhooks
  // -------------------------------------------------------------------------
  WEBHOOKS_READ: "webhooks:read",

  WEBHOOKS_CREATE: "webhooks:create",

  WEBHOOKS_UPDATE: "webhooks:update",

  WEBHOOKS_DELETE: "webhooks:delete",

  WEBHOOKS_ROTATE_SECRET: "webhooks:rotate-secret",
  WEBHOOKS_DELIVERIES_READ: "webhooks:deliveries:read",
} as const;

export type PermissionName =
  (typeof Permissions)[keyof typeof Permissions];