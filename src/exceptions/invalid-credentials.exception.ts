import { HttpStatus } from "@nestjs/common";

import { DomainException } from "./domain.exception.js";

export class InvalidCredentialsException extends DomainException {
  readonly code = "INVALID_CREDENTIALS";

  readonly status = HttpStatus.UNAUTHORIZED;

  constructor(
    message = "Invalid credentials.",
    details?: unknown[],
  ) {
    super(message, details);
  }
}
