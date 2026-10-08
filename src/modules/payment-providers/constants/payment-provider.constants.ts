export const PAYMENT_PROVIDER_METRICS = {
  CREATED: "payment_providers.created",
  UPDATED: "payment_providers.updated",
  ENABLED: "payment_providers.enabled",
  DISABLED: "payment_providers.disabled",
  READ: "payment_providers.read",
  LISTED: "payment_providers.listed",
} as const;

export const PAYMENT_PROVIDER_OPERATIONS = {
  CREATE: "Create Payment Provider",
  UPDATE: "Update Payment Provider",
  GET: "Get Payment Provider",
  LIST: "List Payment Providers",
  ENABLE: "Enable Payment Provider",
  DISABLE: "Disable Payment Provider",
} as const;