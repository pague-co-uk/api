import {
  ApiProperty,
} from "@nestjs/swagger";

import { WebhookResponseDto } from "./webhook-response.dto.js";

export class WebhookSecretResponseDto
  extends WebhookResponseDto {
  @ApiProperty({
    description:
      "Webhook signing secret. Store it securely. It is not returned by normal webhook queries.",
    example:
      "f8K3mP2xV9qL7sA1nB4cD6eR8tY0uI5o",
  })
  secret!: string;
}