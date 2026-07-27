import { UnauthorizedException } from "@nestjs/common";

export class UserNotFoundException
  extends UnauthorizedException {

  constructor();

  constructor(message: string);

  constructor(
    message = "User not found.",
  ) {
    super(message);
  }
}