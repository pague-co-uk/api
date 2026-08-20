import {
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class ChangeSmppPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;
}