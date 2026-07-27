
import { UnauthorizedException } from "@nestjs/common";

export class EmailAlreadyExistsException
  extends UnauthorizedException {

  constructor();

  constructor(message: string);

  constructor(
    message = "Email already exists.",
  ) {
    super(message);
  }
}