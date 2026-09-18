import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateMobileNetworkDto {

  @ApiProperty({
    description:
      "Public identifier for the mobile network.",
    example: "MNO-001",
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly publicId!: string;

  @ApiProperty({
    description:
      "Display name of the mobile network.",
    example: "Airtel Malawi",
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name!: string;

  @ApiProperty({
    description:
      "Unique short code used for the mobile network.",
    example: "AIRTEL-MW",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly code!: string;

  @ApiProperty({
    description:
      "ISO 3166-1 alpha-2 country code.",
    example: "MW",
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  readonly countryCode!: string;

  @ApiPropertyOptional({
    description:
      "Regular expression describing the numbering range allocated to this mobile network. Matching is anchored to the beginning of the destination number.",
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