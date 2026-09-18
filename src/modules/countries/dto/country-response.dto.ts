import {
  ApiProperty,
} from "@nestjs/swagger";

export class CountryResponseDto {

  @ApiProperty({
    example: "MW",
    description:
      "ISO 3166-1 alpha-2 country code.",
  })
  readonly code!: string;

  @ApiProperty({
    example: "Malawi",
  })
  readonly name!: string;

  @ApiProperty({
    example: ["265"],
    description:
      "ITU E.164 country calling codes.",
    type: [String],
  })
  readonly callingCodes!: string[];

}