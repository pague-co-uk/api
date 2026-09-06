import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateMobileNetworkPrefixDto {
  @ApiProperty({
    description: "Phone number prefix for the mobile network.",
    example: "447",
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly prefix!: string;

  @ApiProperty({
    description: "ISO-3166-1 alpha-2 country code.",
    example: "GB",
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}$/)
  readonly countryCode!: string;

  @ApiPropertyOptional({
    description: "Whether the prefix is enabled.",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  readonly enabled?: boolean;
}
