import {
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
} from "class-validator";

export class ResetPasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  readonly token!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  readonly code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly confirmPassword!: string;
}
