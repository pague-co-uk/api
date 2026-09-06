import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class UpdateMobileNetworkPrefixDto {
  @ApiPropertyOptional({
    description: "Phone number prefix for the mobile network.",
    example: "447",
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly prefix?: string;

  @ApiPropertyOptional({
    description: "ISO-3166-1 alpha-2 country code.",
    example: "GB",
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}$/)
  readonly countryCode?: string;

  @ApiPropertyOptional({
    description: "Whether the prefix is enabled.",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  readonly enabled?: boolean;
}
