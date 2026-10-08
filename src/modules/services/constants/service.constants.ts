export const SERVICE_METRICS = {
  CREATED: 'services.created',
  UPDATED: 'services.updated',
  ENABLED: 'services.enabled',
  DISABLED: 'services.disabled',
  READ: 'services.read',
  LISTED: 'services.listed',
} as const;

export const SERVICE_OPERATIONS = {
  CREATE: 'Create Service',
  UPDATE: 'Update Service',
  GET: 'Get Service',
  LIST: 'List Services',
  UPDATE_STATUS: 'Update Service Status',
} as const;