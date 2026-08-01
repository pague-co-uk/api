import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class VerificationChallengeExpiredException
  extends DomainException {

  readonly code = "VERIFICATION_CHALLENGE_EXPIRED";

  readonly status = HttpStatus.BAD_REQUEST;

  constructor(
    details?: unknown[],
  ) {
    super(
      "The verification challenge has expired.",
      details,
    );
  }
}