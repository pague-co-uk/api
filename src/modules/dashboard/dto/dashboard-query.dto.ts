import { Type } from "class-transformer";
import { IsIn, IsOptional, IsInt, Min, Max } from "class-validator";

import type { DashboardPeriod } from "src/repositories/options/dashboard.options.js";

export class DashboardQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsIn(["1d", "7d", "30d", "90d"])
  period?: DashboardPeriod;
}