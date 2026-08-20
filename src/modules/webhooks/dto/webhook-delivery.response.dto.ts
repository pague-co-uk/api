import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";

export class WebhookDeliveryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  webhookEndpointId!: string;

  @ApiProperty()
  messageId!: string;

  @ApiProperty({
    example: 1,
  })
  attemptNumber!: number;

  @ApiPropertyOptional({
    example: 200,
  })
  responseCode!: number | null;

  @ApiPropertyOptional()
  responseBody!: string | null;

  @ApiProperty()
  attemptedAt!: Date;
}