import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class TopUpFloatDto {
  @IsInt()
  @Min(1)
  credits!: number;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}