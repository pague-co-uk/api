import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";

export class CreateUserDto {
  @ApiPropertyOptional({
    description:
      "Client (tenant) identifier. Required when creating a user as a platform super administrator. For client-scoped users, the client is derived from the authenticated user.",
    example:
      "01989d74-2f97-70b0-9cb5-91a9ef3a9a9d",
  })
  @IsOptional()
  @IsUUID()
  readonly clientId?: string;

  @ApiProperty({
    description: "User's first name.",
    example: "John",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  readonly firstName!: string;

  @ApiProperty({
    description: "User's last name.",
    example: "Doe",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  readonly lastName!: string;

  @ApiProperty({
    description: "Unique username.",
    example: "john.doe",
  })
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      "Username may only contain letters, numbers, dots, underscores and hyphens.",
  })
  readonly username!: string;

  @ApiProperty({
    description: "Email address.",
    example: "john.doe@example.com",
  })
  @IsEmail()
  @MaxLength(255)
  readonly email!: string;

  @ApiProperty({
    description: "Initial password.",
    example: "MySecurePassword123!",
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  readonly password!: string;

  @ApiPropertyOptional({
    description: "Phone number in E.164 format.",
    example: "+265991234567",
  })
  @IsOptional()
  @IsPhoneNumber()
  readonly phone?: string;
}