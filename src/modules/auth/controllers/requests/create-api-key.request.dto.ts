import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateApiKeyRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name!: string;

  @IsOptional()
  @IsDateString()
  readonly expiresAt?: string;
}
