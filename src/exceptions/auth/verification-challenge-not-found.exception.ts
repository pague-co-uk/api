import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class VerificationChallengeNotFoundException
  extends DomainException {

  readonly code = "VERIFICATION_CHALLENGE_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(
    details?: unknown[],
  ) {
    super(
      "The verification challenge could not be found.",
      details,
    );
  }
}