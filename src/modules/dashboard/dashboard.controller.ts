import {
  Controller,
  Get,
  Query,
} from "@nestjs/common";

import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import {
  Authorize,
} from "../../common/authorization/decorators/authorize.decorator.js";


import {
  Permissions,
} from "../../common/authorization/permissions/permissions.registry.js";

import {
  ApiSuccessResponse,
} from "../../decorators/api-success-response.decorator.js";


import {
  DashboardQueryDto,
} from "./dto/dashboard-query.dto.js";

import { CurrentUser } from "../../common/authorization/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../common/authorization/interfaces/authenticated-user.interface.js";
import { DashboardMapper } from "./dashboard.mapper.js";
import { DashboardService } from "./dashboard.service.js";
import type {
  DashboardData,
} from "./types/dashboard.types.js";

@ApiTags("Dashboard")
@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly dashboard:
      DashboardService,

    private readonly mapper:
      DashboardMapper,
  ) { }

  @Get()
  @Authorize(
    Permissions.DASHBOARD_READ,
  )
  @ApiOperation({
    summary:
      "Retrieve dashboard analytics.",
  })
  @ApiSuccessResponse(
    Object,
  )
  async getDashboard(
    @CurrentUser()
    user: AuthenticatedUser,

    @Query()
    dto: DashboardQueryDto,
  ): Promise<DashboardData> {
    const dashboard =
      await this.dashboard.getDashboard(
        [user.clientId],
        {
          period:
            dto.period ?? "30d",
        },
      );

    return this.mapper.toResponse(
      dashboard,
    );
  }
}