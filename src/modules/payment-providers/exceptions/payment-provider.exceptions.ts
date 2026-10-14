import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../../../exceptions/domain.exception.js";

export class PaymentProviderNotFoundException extends DomainException {
  readonly code = "PAYMENT_PROVIDER_NOT_FOUND";
  readonly status = HttpStatus.NOT_FOUND;

  constructor(identifier: string) {
    super(`Payment provider '${identifier}' was not found.`);
  }
}

export class PaymentProviderAlreadyExistsException
  extends DomainException {
  readonly code = "PAYMENT_PROVIDER_ALREADY_EXISTS";
  readonly status = HttpStatus.CONFLICT;

  constructor(code: string) {
    super(`Payment provider '${code}' already exists.`);
  }
}

export class PaymentProviderCannotBeDisabledException
  extends DomainException {
  readonly code = "PAYMENT_PROVIDER_CANNOT_BE_DISABLED";
  readonly status = HttpStatus.CONFLICT;

  constructor(code: string) {
    super(
      `Payment provider '${code}' cannot be disabled because it has active provider services.`,
    );
  }
}
