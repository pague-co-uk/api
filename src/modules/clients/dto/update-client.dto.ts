import {
  ApiPropertyOptional,
} from "@nestjs/swagger";
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsTimeZone,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateClientDto {
  @ApiPropertyOptional({
    example: "Vibrant Systems Limited",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly companyName?: string;

  @ApiPropertyOptional({
    example: "Vibrant Systems",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly displayName?: string;

  @ApiPropertyOptional({
    example: "admin@vibrantsystems.com",
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  readonly email?: string;

  @ApiPropertyOptional({
    example: "+265991234567",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly phone?: string;

  @ApiPropertyOptional({
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  readonly rateLimitPerSecond?: number;

  @ApiPropertyOptional({
    example: "Africa/Blantyre",
  })
  @IsOptional()
  @IsTimeZone()
  readonly timezone?: string;
}