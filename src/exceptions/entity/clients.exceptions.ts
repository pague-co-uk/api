import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class ClientNotFoundException extends DomainException {
  readonly code = "CLIENT_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(clientId?: string) {
    super(
      clientId
        ? `Client '${clientId}' was not found.`
        : "Client was not found.",
      [
        {
          clientId,
        },
      ],
    );
  }
}

export class ClientsNotFoundException extends DomainException {
  readonly code = "CLIENTS_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(
    clientIds: readonly string[],
  ) {
    super(
      `The following permissions were not found: ${clientIds.join(", ")}.`,
      clientIds.map((clientId) => ({
        clientId,
      })),
    );
  }
}