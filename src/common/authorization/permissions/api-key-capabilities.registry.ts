export const ApiKeyCapabilities = {
  MESSAGES_SEND: "messages.create",
  MESSAGES_READ: "messages.read",
  MESSAGES_STATUS_READ: "messages.status.read",
  PAYMENTS_CREATE: "payments.create",
  PAYMENTS_READ: "payments.read",
} as const;

export type ApiKeyCapability =
  typeof ApiKeyCapabilities[
  keyof typeof ApiKeyCapabilities
  ];