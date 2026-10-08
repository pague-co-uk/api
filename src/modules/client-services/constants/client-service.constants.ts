export const CLIENT_SERVICE_METRICS = {
  CREATED: "client_services.created",
  UPDATED: "client_services.updated",
  ENABLED: "client_services.enabled",
  DISABLED: "client_services.disabled",
  READ: "client_services.read",
  LISTED: "client_services.listed",
} as const;

export const CLIENT_SERVICE_OPERATIONS = {
  CREATE: "Create Client Service",
  UPDATE: "Update Client Service",
  GET: "Get Client Service",
  LIST: "List Client Services",
  ENABLE: "Enable Client Service",
  DISABLE: "Disable Client Service",
} as const;