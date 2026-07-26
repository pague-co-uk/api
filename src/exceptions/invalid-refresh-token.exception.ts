import { UnauthorizedException } from "@nestjs/common";

export class InvalidRefreshTokenException extends UnauthorizedException {
  constructor();
  constructor(message: string);
  constructor(message = "Invalid refresh token.") {
    super(message);
  }
}