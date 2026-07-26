export enum SessionValidationFailureReason {
  INVALID_TOKEN = "INVALID_TOKEN",

  REVOKED = "REVOKED",

  EXPIRED = "EXPIRED",

  IDLE_TIMEOUT = "IDLE_TIMEOUT",
}