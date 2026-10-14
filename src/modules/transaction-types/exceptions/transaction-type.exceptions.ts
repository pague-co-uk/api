import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../../../exceptions/domain.exception.js";

export class TransactionTypeNotFoundException
  extends DomainException {
  readonly code = "TRANSACTION_TYPE_NOT_FOUND";
  readonly status = HttpStatus.NOT_FOUND;

  constructor(identifier: string) {
    super(`Transaction type '${identifier}' was not found.`);
  }
}

export class TransactionTypeAlreadyExistsException
  extends DomainException {
  readonly code = "TRANSACTION_TYPE_ALREADY_EXISTS";
  readonly status = HttpStatus.CONFLICT;

  constructor(code: string) {
    super(`Transaction type '${code}' already exists.`);
  }
}
