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
  [Permissions.USERS_LOCK]: {
    module: "users",
    description: "lock users.",
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
  [Permissions.SENDER_IDS_ENABLE]: {
    module: "sender_ids",
    description: "Enable Sender IDs.",
  },

  [Permissions.SENDER_IDS_DEFAULT_UPDATE]: {
    module: "sender_ids",
    description: "Change the default Sender ID.",
  },

  // -------------------------------------------------------------------------
  // Mobile Networks
  // -------------------------------------------------------------------------

  [Permissions.MOBILE_NETWORKS_READ]: {
    module: "mobile_networks",
    description: "View mobile networks.",
  },

  [Permissions.MOBILE_NETWORKS_CREATE]: {
    module: "mobile_networks",
    description: "Create mobile networks.",
  },

  [Permissions.MOBILE_NETWORKS_UPDATE]: {
    module: "mobile_networks",
    description: "Update mobile networks.",
  },

  [Permissions.MOBILE_NETWORKS_DELETE]: {
    module: "mobile_networks",
    description: "Delete mobile networks.",
  },

  [Permissions.MOBILE_NETWORKS_ENABLE]: {
    module: "mobile_networks",
    description: "Enable mobile networks.",
  },

  [Permissions.MOBILE_NETWORKS_DISABLE]: {
    module: "mobile_networks",
    description: "Disable mobile networks.",
  },

  // -------------------------------------------------------------------------
  // Connectors
  // -------------------------------------------------------------------------

  [Permissions.CONNECTORS_READ]: {
    module: "connectors",
    description: "View connectors.",
  },

  [Permissions.CONNECTORS_CREATE]: {
    module: "connectors",
    description: "Create connectors.",
  },

  [Permissions.CONNECTORS_UPDATE]: {
    module: "connectors",
    description: "Update connectors.",
  },

  [Permissions.CONNECTORS_DELETE]: {
    module: "connectors",
    description: "Delete connectors.",
  },

  [Permissions.CONNECTORS_ENABLE]: {
    module: "connectors",
    description: "Enable connectors.",
  },

  [Permissions.CONNECTORS_DISABLE]: {
    module: "connectors",
    description: "Disable connectors.",
  },

  [Permissions.CONNECTORS_SUSPEND]: {
    module: "connectors",
    description: "Suspend connectors.",
  },

  // -------------------------------------------------------------------------
  // Routes
  // -------------------------------------------------------------------------

  [Permissions.ROUTES_READ]: {
    module: "routes",
    description: "View routes.",
  },

  [Permissions.ROUTES_CREATE]: {
    module: "routes",
    description: "Create routes.",
  },

  [Permissions.ROUTES_UPDATE]: {
    module: "routes",
    description: "Update routes.",
  },

  [Permissions.ROUTES_DELETE]: {
    module: "routes",
    description: "Delete routes.",
  },

  [Permissions.ROUTES_ENABLE]: {
    module: "routes",
    description: "Enable routes.",
  },

  [Permissions.ROUTES_DISABLE]: {
    module: "routes",
    description: "Disable routes.",
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
  [Permissions.MESSAGES_STATUS_READ]: {
    module: "messages",
    description: "read message status.",
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
  [Permissions.PLATFORM_SUPER_ADMIN]: {
    module: "all",
    description: "can access all clients"
  },
  [Permissions.CHECK_HEALTH]: {
    module: "all",
    description: "can check system health"
  },
  [Permissions.DASHBOARD_READ]: {
    module: "dashboard",
    description: "can view  dashboard"
  },
  [Permissions.REPORTS_READ]: {
    module: "reports",
    description: "can read  reports"
  },
  [Permissions.REPORTS_EXPORT]: {
    module: "reports",
    description: "can exports  reports"
  },

  // -------------------------------------------------------------------------
  // Services
  // -------------------------------------------------------------------------

  [Permissions.SERVICES_READ]: {
    module: "services",
    description: "View services.",
  },

  [Permissions.SERVICES_CREATE]: {
    module: "services",
    description: "Create services.",
  },

  [Permissions.SERVICES_UPDATE]: {
    module: "services",
    description: "Update services.",
  },

  [Permissions.SERVICES_ENABLE]: {
    module: "services",
    description: "Enable services.",
  },

  [Permissions.SERVICES_DISABLE]: {
    module: "services",
    description: "Disable services.",
  },
  [Permissions.CLIENT_SERVICES_READ]: {
    module: "client_services",
    description: "View client service assignments.",
  },

  [Permissions.CLIENT_SERVICES_CREATE]: {
    module: "client_services",
    description: "Assign services to clients.",
  },

  [Permissions.CLIENT_SERVICES_UPDATE]: {
    module: "client_services",
    description: "Update client service configuration.",
  },

  [Permissions.CLIENT_SERVICES_ENABLE]: {
    module: "client_services",
    description: "Enable services for clients.",
  },

  [Permissions.CLIENT_SERVICES_DISABLE]: {
    module: "client_services",
    description: "Disable services for clients.",
  },
  [Permissions.PAYMENT_PROVIDERS_READ]: {
    module: "payment_providers",
    description: "View payment providers.",
  },

  [Permissions.PAYMENT_PROVIDERS_CREATE]: {
    module: "payment_providers",
    description: "Create payment providers.",
  },

  [Permissions.PAYMENT_PROVIDERS_UPDATE]: {
    module: "payment_providers",
    description: "Update payment provider configuration.",
  },

  [Permissions.PAYMENT_PROVIDERS_ENABLE]: {
    module: "payment_providers",
    description: "Enable payment providers.",
  },

  [Permissions.PAYMENT_PROVIDERS_DISABLE]: {
    module: "payment_providers",
    description: "Disable payment providers.",
  },
  [Permissions.PROVIDER_SERVICES_READ]: {
    module: "provider_services",
    description: "View provider service configurations.",
  },

  [Permissions.PROVIDER_SERVICES_CREATE]: {
    module: "provider_services",
    description: "Create provider service configurations.",
  },

  [Permissions.PROVIDER_SERVICES_UPDATE]: {
    module: "provider_services",
    description: "Update provider service configuration.",
  },

  [Permissions.PROVIDER_SERVICES_ENABLE]: {
    module: "provider_services",
    description: "Enable provider service configurations.",
  },

  [Permissions.PROVIDER_SERVICES_DISABLE]: {
    module: "provider_services",
    description: "Disable provider service configurations.",
  },
  [Permissions.TRANSACTION_TYPES_READ]: {
    module: "transaction_types",
    description: "View transaction types.",
  },

  [Permissions.TRANSACTION_TYPES_CREATE]: {
    module: "transaction_types",
    description: "Create transaction types.",
  },

  [Permissions.TRANSACTION_TYPES_UPDATE]: {
    module: "transaction_types",
    description: "Update transaction type configuration.",
  },

  [Permissions.TRANSACTION_TYPES_ENABLE]: {
    module: "transaction_types",
    description: "Enable transaction types.",
  },

  [Permissions.TRANSACTION_TYPES_DISABLE]: {
    module: "transaction_types",
    description: "Disable transaction types.",
  },
  [Permissions.CURRENCIES_READ]: {
    module: "currencies",
    description: "View currencies.",
  },

  [Permissions.CURRENCIES_CREATE]: {
    module: "currencies",
    description: "Create currencies.",
  },

  [Permissions.CURRENCIES_UPDATE]: {
    module: "currencies",
    description: "Update currency configuration.",
  },

  [Permissions.CURRENCIES_ENABLE]: {
    module: "currencies",
    description: "Enable currencies.",
  },

  [Permissions.CURRENCIES_DISABLE]: {
    module: "currencies",
    description: "Disable currencies.",
  },
  [Permissions.COUNTRY_CURRENCIES_READ]: {
    module: "country-currencies",
    description:
      "View country currency configuration.",
  },

  [Permissions.COUNTRY_CURRENCIES_CREATE]: {
    module: "country-currencies",
    description:
      "Configure a currency for a country.",
  },

  [Permissions.COUNTRY_CURRENCIES_UPDATE]: {
    module: "country-currencies",
    description:
      "Update country currency configuration.",
  },

  [Permissions.COUNTRY_CURRENCIES_DELETE]: {
    module: "country-currencies",
    description:
      "Remove a currency from a country.",
  },
  [Permissions.PAYMENTS_CREATE]: {
    module: "payments",
    description:
      "Create a payment transaction.",
  },

  [Permissions.PAYMENTS_READ]: {
    module: "payments",
    description:
      "View the status of a payment transaction.",
  },
} as const;