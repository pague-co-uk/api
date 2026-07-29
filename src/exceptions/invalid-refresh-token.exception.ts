import { HttpStatus } from "@nestjs/common";

import { DomainException } from "./domain.exception.js";

export class InvalidRefreshTokenException extends DomainException {
  readonly code = "INVALID_REFRESH_TOKEN";

  readonly status = HttpStatus.UNAUTHORIZED;

  constructor(
    message = "Invalid refresh token.",
    details?: unknown[],
  ) {
    super(message, details);
  }
}
