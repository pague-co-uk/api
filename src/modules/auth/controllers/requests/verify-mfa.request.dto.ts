import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  Length,
} from "class-validator";

export class VerifyMfaRequestDto {
  @IsString()
  @IsNotEmpty()
  readonly verificationToken!: string;

  @IsString()
  @Length(6, 6)
  readonly code!: string;

  @IsBoolean()
  readonly rememberDevice!: boolean;
}