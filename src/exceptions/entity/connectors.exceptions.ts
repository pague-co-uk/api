import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class ConnectorNotFoundException extends DomainException {
  readonly code = "CONNECTOR_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(connectorId: string) {
    super(`Connector '${connectorId}' not found.`, [{ connectorId }]);
  }
}

export class ConnectorAlreadyExistsException extends DomainException {
  readonly code = "CONNECTOR_ALREADY_EXISTS";

  readonly status = HttpStatus.CONFLICT;

  constructor(value: string) {
    super(`Connector '${value}' already exists.`, [{ value }]);
  }
}
