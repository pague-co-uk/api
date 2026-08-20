import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class AdjustFloatDto {
  @IsInt()
  credits!: number;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsString()
  @IsNotEmpty()
  description!: string;
}