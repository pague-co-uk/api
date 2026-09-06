import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";

export class WebhookResponseDto {

  @ApiProperty({
    example:
      "7d5f4c3a-1234-4567-8901-abcdef123456",
  })
  id!: string;

  @ApiProperty({
    example:
      "wh_8Kx92LmPqR4sT",
  })
  publicId!: string;

  @ApiPropertyOptional({
    type: "object",
    nullable: true,
    properties: {
      id: {
        type: "string",
      },
      publicId: {
        type: "string",
      },
      companyName: {
        type: "string",
      },
      displayName: {
        type: "string",
      },
    },
  })
  client?: {
    id: string;
    publicId: string;
    companyName: string;
    displayName: string;
  };

  @ApiProperty({
    example:
      "Delivery Notifications",
  })
  name!: string;

  @ApiProperty({
    example:
      "https://example.com/webhooks/sms",
  })
  url!: string;

  @ApiProperty({
    example: true,
  })
  enabled!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}