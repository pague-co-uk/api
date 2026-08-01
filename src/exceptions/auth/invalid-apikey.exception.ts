import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class InvalidApiKeyException
  extends DomainException {
  readonly code = "INVALID_API_KEY";

  readonly status = HttpStatus.UNAUTHORIZED;

  constructor(
    message = "Invalid API key.",
    details?: unknown[],
  ) {
    super(message, details);
  }
}
