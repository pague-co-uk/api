import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class InvalidVerificationCodeException
  extends DomainException {

  readonly code = "INVALID_VERIFICATION_CODE";

  readonly status = HttpStatus.BAD_REQUEST;

  constructor(
    details?: unknown[],
  ) {
    super(
      "The verification code is invalid.",
      details,
    );
  }
}