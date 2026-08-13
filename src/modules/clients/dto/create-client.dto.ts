import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateClientDto {
  @ApiProperty({
    example: "Pague Limited",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly companyName!: string;

  @ApiProperty({
    example: "PAGUE",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly clientCode!: string;

  @ApiPropertyOptional({
    example: "Pague Limited",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly displayName?: string;

  @ApiProperty({
    example: "admin@pague.co.uk",
  })
  @IsEmail()
  @MaxLength(255)
  readonly email!: string;

  @ApiPropertyOptional({
    example: "+265991234567",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly phone?: string;

  @ApiPropertyOptional({
    example: 100,
    description:
      "Maximum number of requests/messages permitted per second.",
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