import { IsIn, IsOptional } from "class-validator";

import type { DashboardPeriod } from "src/repositories/options/dashboard.options.js";

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(["7d", "30d", "90d"])
  period?: DashboardPeriod;
}