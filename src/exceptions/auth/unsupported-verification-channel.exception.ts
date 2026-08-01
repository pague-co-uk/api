import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class UnsupportedVerificationChannelException
  extends DomainException {

  readonly code = "UNSUPPORTED_VERIFICATION_CHANNEL";

  readonly status = HttpStatus.BAD_REQUEST;

  constructor(
    channel: string,
    details?: unknown[],
  ) {
    super(
      `Unsupported verification channel: ${channel}.`,
      details,
    );
  }
}