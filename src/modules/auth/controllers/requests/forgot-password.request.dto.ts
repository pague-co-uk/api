import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class ForgotPasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly identifier!: string;
}