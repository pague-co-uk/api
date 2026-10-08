export class PaymentProviderNotFoundException extends Error {
  constructor(identifier: string) {
    super(
      `Payment provider '${identifier}' was not found.`,
    );
    this.name =
      "PaymentProviderNotFoundException";
  }
}

export class PaymentProviderAlreadyExistsException
  extends Error {
  constructor(code: string) {
    super(
      `Payment provider '${code}' already exists.`,
    );
    this.name =
      "PaymentProviderAlreadyExistsException";
  }
}

export class PaymentProviderCannotBeDisabledException
  extends Error {
  constructor(code: string) {
    super(
      `Payment provider '${code}' cannot be disabled because it has active provider services.`,
    );
    this.name =
      "PaymentProviderCannotBeDisabledException";
  }
}