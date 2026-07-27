import { UnauthorizedException } from "@nestjs/common";

export class InvalidCredentialsException extends UnauthorizedException {
  constructor();
  constructor(message: string);
  constructor(message = "Invalid credentials.") {
    super(message);
  }
}