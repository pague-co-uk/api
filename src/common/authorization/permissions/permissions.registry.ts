export const Permissions = {
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  USERS_ACTIVATE: "users.activate",
  USERS_DEACTIVATE: "users.deactivate",
  USERS_UNLOCK: "users.unlock",
  USERS_ROLES_UPDATE: "users.roles.update",

  PERMISSIONS_READ: "permissions.read",

  ROLES_READ: "roles.read",
  ROLES_CREATE: "roles.create",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",
  CLIENTS_READ: "clients.read",
  CLIENTS_CREATE: "clients.create",
  CLIENTS_UPDATE: "clients.update",
  CLIENTS_DELETE: "clients.delete",
  CLIENTS_ACTIVATE: "clients.activate",
  CLIENTS_SUSPEND: "clients.suspend",
  CLIENTS_DISABLE: "clients.disable",


  SENDER_IDS_READ: "sender_ids.read",
  SENDER_IDS_CREATE: "sender_ids.create",
  SENDER_IDS_UPDATE: "sender_ids.update",
  SENDER_IDS_DELETE: "sender_ids.delete",
  SENDER_IDS_APPROVE: "sender_ids.approve",
  SENDER_IDS_REJECT: "sender_ids.reject",
  SENDER_IDS_DISABLE: "sender_ids.disable",
  SENDER_IDS_DEFAULT_UPDATE: "sender_ids.default.update",

  API_KEYS_READ: "api_keys.read",
  API_KEYS_CREATE: "api_keys.create",
  API_KEYS_REVOKE: "api_keys.revoke",
} as const;

export type PermissionName =
  (typeof Permissions)[keyof typeof Permissions];