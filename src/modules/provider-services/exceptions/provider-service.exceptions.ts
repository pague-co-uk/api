export class ProviderServiceNotFoundException extends Error {
  constructor(identifier: string) {
    super(
      `Provider service '${identifier}' was not found.`,
    );
    this.name =
      "ProviderServiceNotFoundException";
  }
}

export class ProviderServiceAlreadyExistsException
  extends Error {
  constructor(
    providerCode: string,
    serviceCode: string,
  ) {
    super(
      `Provider service '${providerCode}' for service '${serviceCode}' already exists.`,
    );
    this.name =
      "ProviderServiceAlreadyExistsException";
  }
}

export class PaymentProviderNotFoundException
  extends Error {
  constructor(providerCode: string) {
    super(
      `Payment provider '${providerCode}' was not found.`,
    );
    this.name =
      "PaymentProviderNotFoundException";
  }
}

export class PaymentProviderNotActiveException
  extends Error {
  constructor(providerCode: string) {
    super(
      `Payment provider '${providerCode}' is not active.`,
    );
    this.name =
      "PaymentProviderNotActiveException";
  }
}

export class ServiceNotFoundException
  extends Error {
  constructor(serviceCode: string) {
    super(
      `Service '${serviceCode}' was not found.`,
    );
    this.name =
      "ServiceNotFoundException";
  }
}

export class ServiceNotActiveException
  extends Error {
  constructor(serviceCode: string) {
    super(
      `Service '${serviceCode}' is not active.`,
    );
    this.name =
      "ServiceNotActiveException";
  }
}