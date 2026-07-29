import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class LoginRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly password!: string;

  @IsOptional()
  @IsUUID()
  readonly trustedDeviceId?: string;
}