export const PROVIDER_SERVICE_METRICS = {
  CREATED: "provider_services.created",
  UPDATED: "provider_services.updated",
  ENABLED: "provider_services.enabled",
  DISABLED: "provider_services.disabled",
  READ: "provider_services.read",
  LISTED: "provider_services.listed",
} as const;

export const PROVIDER_SERVICE_OPERATIONS = {
  CREATE: "Create Provider Service",
  UPDATE: "Update Provider Service",
  GET: "Get Provider Service",
  LIST: "List Provider Services",
  ENABLE: "Enable Provider Service",
  DISABLE: "Disable Provider Service",
} as const;