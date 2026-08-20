import {
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class FindFloatLedgerDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}