import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class LoginWithApiKeyRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly apiKey!: string;
}
