import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../../../exceptions/domain.exception.js";

export class ProviderServiceNotFoundException extends DomainException {
  readonly code = "PROVIDER_SERVICE_NOT_FOUND";
  readonly status = HttpStatus.NOT_FOUND;

  constructor(identifier: string) {
    super(`Provider service '${identifier}' was not found.`);
  }
}

export class ProviderServiceAlreadyExistsException
  extends DomainException {
  readonly code = "PROVIDER_SERVICE_ALREADY_EXISTS";
  readonly status = HttpStatus.CONFLICT;

  constructor(
    providerCode: string,
    serviceCode: string,
  ) {
    super(
      `Provider service '${providerCode}' for service '${serviceCode}' already exists.`,
    );
  }
}

export class PaymentProviderNotFoundException
  extends DomainException {
  readonly code = "PAYMENT_PROVIDER_NOT_FOUND";
  readonly status = HttpStatus.NOT_FOUND;

  constructor(providerCode: string) {
    super(`Payment provider '${providerCode}' was not found.`);
  }
}

export class PaymentProviderNotActiveException
  extends DomainException {
  readonly code = "PAYMENT_PROVIDER_NOT_ACTIVE";
  readonly status = HttpStatus.CONFLICT;

  constructor(providerCode: string) {
    super(`Payment provider '${providerCode}' is not active.`);
  }
}

export class ServiceNotFoundException
  extends DomainException {
  readonly code = "SERVICE_NOT_FOUND";
  readonly status = HttpStatus.NOT_FOUND;

  constructor(serviceCode: string) {
    super(`Service '${serviceCode}' was not found.`);
  }
}

export class ServiceNotActiveException
  extends DomainException {
  readonly code = "SERVICE_NOT_ACTIVE";
  readonly status = HttpStatus.CONFLICT;

  constructor(serviceCode: string) {
    super(`Service '${serviceCode}' is not active.`);
  }
}
