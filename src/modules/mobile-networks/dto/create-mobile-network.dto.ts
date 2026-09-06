import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

export class CreateMobileNetworkDto {
  @ApiProperty({ description: "Public identifier for the mobile network.", example: "MNO-001", maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly publicId!: string;

  @ApiProperty({ description: "Display name of the mobile network.", example: "Vodafone UK", maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name!: string;

  @ApiProperty({ description: "Unique short code used for the mobile network.", example: "VOD", maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly code!: string;

  @ApiProperty({ description: "ISO-3166-1 alpha-2 country code.", example: "GB", minLength: 2, maxLength: 2 })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}$/)
  readonly countryCode!: string;
}
