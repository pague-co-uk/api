import type {
  ApiKeyCapability,
} from "./api-key-capabilities.registry.js";

import {
  ApiKeyCapabilities,
} from "./api-key-capabilities.registry.js";

export interface ApiKeyCapabilityDefinition {
  readonly module: string;
  readonly description: string;
}

export const ApiKeyCapabilityDefinitions: {
  readonly [
  P in ApiKeyCapability
  ]: ApiKeyCapabilityDefinition;
} = {
  [ApiKeyCapabilities.MESSAGES_SEND]: {
    module: "messages",
    description: "Send SMS messages.",
  },

  [ApiKeyCapabilities.MESSAGES_READ]: {
    module: "messages",
    description: "View messages.",
  },

  [ApiKeyCapabilities.MESSAGES_STATUS_READ]: {
    module: "messages",
    description: "View message delivery status.",
  },
  [ApiKeyCapabilities.PAYMENTS_CREATE]: {
    module: "payments",
    description:
      "Create a payment transaction.",
  },

  [ApiKeyCapabilities.PAYMENTS_READ]: {
    module: "payments",
    description:
      "View the status of a payment transaction.",
  },
} as const;