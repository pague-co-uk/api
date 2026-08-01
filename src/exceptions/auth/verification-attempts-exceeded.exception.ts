import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class VerificationAttemptsExceededException
  extends DomainException {

  readonly code = "VERIFICATION_ATTEMPTS_EXCEEDED";

  readonly status = HttpStatus.TOO_MANY_REQUESTS;

  constructor(
    details?: unknown[],
  ) {
    super(
      "The maximum number of verification attempts has been exceeded.",
      details,
    );
  }
}