import {
  ApiPropertyOptional,
} from "@nestjs/swagger";

import {
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateMobileNetworkDto {

  @ApiPropertyOptional({
    description:
      "Display name of the mobile network.",
    example:
      "Vodafone UK",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly name?: string;

  @ApiPropertyOptional({
    description:
      "Unique short code used for the mobile network.",
    example:
      "VOD",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly code?: string;

  @ApiPropertyOptional({
    description:
      "ISO 3166-1 alpha-2 country code.",
    example:
      "MW",
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  readonly countryCode?: string;

  @ApiPropertyOptional({
    description:
      "Regular expression describing the numbering range allocated to this mobile network. The expression is matched from the beginning of the destination number.",
    example:
      "^265(?:88|89|90)",
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly routingRegex?: string | null;

}