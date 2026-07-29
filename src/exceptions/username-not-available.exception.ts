
import { HttpStatus } from "@nestjs/common";

import { DomainException } from "./domain.exception.js";

export class UsernameAlreadyExistsException
  extends DomainException {
  readonly code = "USERNAME_ALREADY_EXISTS";

  readonly status = HttpStatus.CONFLICT;

  constructor(
    username?: string,
    details?: unknown[],
  ) {
    super(
      username
        ? `Username "${username}" already exists.`
        : "Username already exists.",
      details,
    );
  }
}
