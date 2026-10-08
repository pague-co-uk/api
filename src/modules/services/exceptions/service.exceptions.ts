import { HttpStatus } from "@nestjs/common";
import { DomainException } from "../../../exceptions/domain.exception.js";


export class ServiceNotFoundException extends DomainException {
  readonly code = "SERVICE_NOT_FOUND";
  readonly status = HttpStatus.NOT_FOUND;

  constructor(id: string) {
    super(`Service '${id}' was not found.`);
  }
}

export class ServiceCodeAlreadyExistsException extends DomainException {
  readonly code = "SERVICE_CODE_ALREADY_EXISTS";
  readonly status = HttpStatus.CONFLICT;

  constructor(code: string) {
    super(`Service code '${code}' already exists.`);
  }
}

export class ServiceNameAlreadyExistsException extends DomainException {
  readonly code = "SERVICE_NAME_ALREADY_EXISTS";
  readonly status = HttpStatus.CONFLICT;

  constructor(name: string) {
    super(`Service name '${name}' already exists.`);
  }
}

export class ServiceCannotBeDisabledException extends DomainException {
  readonly code = "SERVICE_CANNOT_BE_DISABLED";
  readonly status = HttpStatus.CONFLICT;

  constructor(code: string) {
    super(
      `Service '${code}' cannot be disabled because it has active client assignments.`,
    );
  }
}