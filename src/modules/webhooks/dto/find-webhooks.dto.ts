import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class FindWebhooksDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;
}