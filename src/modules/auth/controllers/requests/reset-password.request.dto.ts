import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class ResetPasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  readonly token!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly confirmPassword!: string;
}