
import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class SenderIdNotApprovedException extends DomainException {
  readonly code = "SENDER_ID_NOT_APPROVED";

  readonly status = HttpStatus.BAD_REQUEST;

  constructor(
    senderId: string,
  ) {
    super(
      `Sender Id '${senderId}' has not been approved.`,
      [
        {
          senderId,
        },
      ],
    );
  }
}

export class SenderIdNotFoundException extends DomainException {
  readonly code = "SENDER_ID_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(
    senderId: string,
  ) {
    super(
      `Sender Id '${senderId}' not found.`,
      [
        {
          senderId,
        },
      ],
    );
  }
}


export class SenderIdAlreadyExistsException extends DomainException {
  readonly code = "SENDER_ID_ALREDY_EXISTS";

  readonly status = HttpStatus.CONFLICT;

  constructor(
    publicId: string,
  ) {
    super(
      `Sender Id '${publicId}' Already Exists.`,
      [
        {
          publicId,
        },
      ],
    );
  }
}
