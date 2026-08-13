import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApiKeyCreatedResponseDto {
  @ApiProperty()
  apiKeyId!: string;

  @ApiProperty()
  publicId!: string;

  @ApiProperty({
    description:
      "The complete API key. This secret is returned only once.",
  })
  apiKey!: string;

  @ApiProperty()
  prefix!: string;

  @ApiPropertyOptional({
    nullable: true,
  })
  expiresAt!: Date | null;
}