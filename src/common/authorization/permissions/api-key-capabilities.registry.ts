export const ApiKeyCapabilities = {
  MESSAGES_SEND: "messages.send",
  MESSAGES_READ: "messages.read",
  MESSAGES_STATUS_READ: "messages.status.read",
} as const;

export type ApiKeyCapability =
  typeof ApiKeyCapabilities[
  keyof typeof ApiKeyCapabilities
  ];