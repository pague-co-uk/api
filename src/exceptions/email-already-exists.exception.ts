
import { HttpStatus } from "@nestjs/common";

import { DomainException } from "./domain.exception.js";

export class EmailAlreadyExistsException
  extends DomainException {
  readonly code = "EMAIL_ALREADY_EXISTS";

  readonly status = HttpStatus.CONFLICT;

  constructor(
    email?: string,
    details?: unknown[],
  ) {
    super(
      email
        ? `Email "${email}" already exists.`
        : "Email already exists.",
      details,
    );
  }
}
