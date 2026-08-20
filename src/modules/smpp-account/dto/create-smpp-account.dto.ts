import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateSmppAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  systemId!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;

  @IsInt()
  @Min(1)
  maxConcurrentBinds?: number;

  @IsInt()
  @Min(5)
  @Max(3600)
  enquireLinkInterval?: number;
}