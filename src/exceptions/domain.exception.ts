import { HttpStatus } from "@nestjs/common";

export abstract class DomainException extends Error {
  abstract readonly code: string;

  abstract readonly status: HttpStatus;

  readonly details?: unknown[];

  protected constructor(
    message: string,
    details?: unknown[],
  ) {
    super(message);

    this.name = new.target.name;
    this.details = details;

    Error.captureStackTrace(this, new.target);
  }
}