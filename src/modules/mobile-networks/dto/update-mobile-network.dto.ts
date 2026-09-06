import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class UpdateMobileNetworkDto {
  @ApiPropertyOptional({ description: "Display name of the mobile network.", example: "Vodafone UK", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly name?: string;

  @ApiPropertyOptional({ description: "Unique short code used for the mobile network.", example: "VOD", maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly code?: string;

  @ApiPropertyOptional({ description: "ISO-3166-1 alpha-2 country code.", example: "GB", minLength: 2, maxLength: 2 })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  readonly countryCode?: string;
}
