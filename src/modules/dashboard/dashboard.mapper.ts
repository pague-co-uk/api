import {
  Injectable,
} from "@nestjs/common";

import type {
  DashboardData,
} from "./types/dashboard.types.js";

@Injectable()
export class DashboardMapper {
  toResponse(
    dashboard: DashboardData,
  ): DashboardData {
    return dashboard;
  }
}