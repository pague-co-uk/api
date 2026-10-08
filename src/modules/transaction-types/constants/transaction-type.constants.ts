export const TRANSACTION_TYPE_METRICS = {
  CREATED: "transaction_types.created",
  UPDATED: "transaction_types.updated",
  ENABLED: "transaction_types.enabled",
  DISABLED: "transaction_types.disabled",
  READ: "transaction_types.read",
  LISTED: "transaction_types.listed",
} as const;

export const TRANSACTION_TYPE_OPERATIONS = {
  CREATE: "Create Transaction Type",
  UPDATE: "Update Transaction Type",
  GET: "Get Transaction Type",
  LIST: "List Transaction Types",
  ENABLE: "Enable Transaction Type",
  DISABLE: "Disable Transaction Type",
} as const;