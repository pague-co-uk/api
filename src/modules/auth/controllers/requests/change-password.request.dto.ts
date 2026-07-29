import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class ChangePasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly confirmPassword!: string;
}