import { UnauthorizedException } from "@nestjs/common";

export class InvalidApiKeyException
  extends UnauthorizedException {

  constructor();

  constructor(message: string);

  constructor(
    message = "Invalid API key.",
  ) {
    super(message);
  }
}