import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

import {
  ApiPropertyOptional,
} from "@nestjs/swagger";

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: "User's first name.",
    example: "John",
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  readonly firstName?: string;

  @ApiPropertyOptional({
    description: "User's last name.",
    example: "Doe",
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  readonly lastName?: string;

  @ApiPropertyOptional({
    description: "Unique username.",
    example: "john.doe",
  })
  @IsOptional()
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      "Username may only contain letters, numbers, dots, underscores and hyphens.",
  })
  readonly username?: string;

  @ApiPropertyOptional({
    description: "Email address.",
    example: "john.doe@example.com",
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  readonly email?: string;

  @ApiPropertyOptional({
    description: "Phone number in E.164 format.",
    example: "+265991234567",
  })
  @IsOptional()
  @IsPhoneNumber()
  readonly phone?: string;
}