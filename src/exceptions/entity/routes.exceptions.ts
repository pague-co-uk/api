import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class RouteNotFoundException extends DomainException {
  readonly code = "ROUTE_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(routeId: string) {
    super(`Route '${routeId}' not found.`, [{ routeId }]);
  }
}

export class RouteAlreadyExistsException extends DomainException {
  readonly code = "ROUTE_ALREADY_EXISTS";

  readonly status = HttpStatus.CONFLICT;

  constructor(clientId: string, mobileNetworkId: string, priority: number) {
    super(`Route for client '${clientId}' and mobile network '${mobileNetworkId}' with priority '${priority}' already exists.`, [{ clientId, mobileNetworkId, priority }]);
  }
}
