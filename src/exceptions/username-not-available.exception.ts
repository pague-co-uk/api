
import { UnauthorizedException } from "@nestjs/common";

export class UsernameAlreadyExistsException
  extends UnauthorizedException {

  constructor();

  constructor(message: string);

  constructor(
    message = "Username already exists.",
  ) {
    super(message);
  }
}