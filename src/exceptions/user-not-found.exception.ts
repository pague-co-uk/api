import { HttpStatus } from "@nestjs/common";

import { DomainException } from "./domain.exception.js";

export class UserNotFoundException
  extends DomainException {
  readonly code = "USER_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(
    message = "User not found.",
    details?: unknown[],
  ) {
    super(message, details);
  }
}
