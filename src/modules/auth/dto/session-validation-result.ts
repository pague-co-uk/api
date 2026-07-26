import type { PortalSession } from "@prisma/client";

import { SessionValidationFailureReason } from "../enums/session-validation-failure-reason.enum.js";

export type SessionValidationResult =
  | {
    valid: true;

    session: PortalSession;
  }
  | {
    valid: false;

    reason: SessionValidationFailureReason;
  };