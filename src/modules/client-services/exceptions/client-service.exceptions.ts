import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../../../exceptions/domain.exception.js";

export class ClientNotFoundException extends DomainException {
  readonly code = "CLIENT_NOT_FOUND";
  readonly status = HttpStatus.NOT_FOUND;

  constructor(clientId: string) {
    super(`Client '${clientId}' was not found.`);
  }
}

export class ServiceNotFoundException extends DomainException {
  readonly code = "SERVICE_NOT_FOUND";
  readonly status = HttpStatus.NOT_FOUND;

  constructor(serviceCode: string) {
    super(`Service '${serviceCode}' was not found.`);
  }
}

export class ServiceNotActiveException extends DomainException {
  readonly code = "SERVICE_NOT_ACTIVE";
  readonly status = HttpStatus.CONFLICT;

  constructor(serviceCode: string) {
    super(`Service '${serviceCode}' is not active.`);
  }
}

export class ClientServiceNotFoundException extends DomainException {
  readonly code = "CLIENT_SERVICE_NOT_FOUND";
  readonly status = HttpStatus.NOT_FOUND;

  constructor(
    clientId: string,
    serviceId: string,
  ) {
    super(
      `Service '${serviceId}' is not assigned to client '${clientId}'.`,
    );
  }
}

export class ClientServiceAlreadyExistsException
  extends DomainException {
  readonly code = "CLIENT_SERVICE_ALREADY_EXISTS";
  readonly status = HttpStatus.CONFLICT;

  constructor(
    clientId: string,
    serviceCode: string,
  ) {
    super(
      `Service '${serviceCode}' is already assigned to client '${clientId}'.`,
    );
  }
}

export class ClientServiceCannotBeEnabledException
  extends DomainException {
  readonly code = "CLIENT_SERVICE_CANNOT_BE_ENABLED";
  readonly status = HttpStatus.CONFLICT;

  constructor(serviceCode: string) {
    super(
      `Client service assignment cannot be enabled because service '${serviceCode}' is not active.`,
    );
  }
}

export class PaymentServiceInvalidCurrenciesException
  extends DomainException {
  readonly code = "PAYMENT_SERVICE_INVALID_CURRENCIES";
  readonly status = HttpStatus.BAD_REQUEST;

  constructor(currencies: string[]) {
    super(
      `Payment service configuration contains invalid or inactive currencies: ${currencies.join(", ")}.`,
    );
  }
}

export class PaymentServiceInvalidTransactionTypesException
  extends DomainException {
  readonly code =
    "PAYMENT_SERVICE_INVALID_TRANSACTION_TYPES";
  readonly status = HttpStatus.BAD_REQUEST;

  constructor(transactionTypes: string[]) {
    super(
      `Payment service configuration contains invalid or inactive transaction types: ${transactionTypes.join(", ")}.`,
    );
  }
}