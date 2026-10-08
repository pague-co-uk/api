import {
  Controller,
  Get,
  Query,
} from "@nestjs/common";

import {
  PaymentDashboardService,
} from "../services/payment-dashboard.service.js";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { CurrentUser } from "../../../common/authorization/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../../common/authorization/interfaces/authenticated-user.interface.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import type { DashboardQueryOptions } from "../../../repositories/options/dashboard.options.js";
import type {
  PaymentDashboardData,
} from "../types/payment-dashboard.types.js";

@Controller("dashboard/payments")
export class PaymentDashboardController {
  constructor(
    private readonly paymentDashboard:
      PaymentDashboardService,
  ) { }

  @Get()
  @Authorize(Permissions.PAYMENTS_READ)
  async getDashboard(
    @CurrentUser()
    user: AuthenticatedUser,

    @Query()
    query: DashboardQueryOptions,
  ): Promise<PaymentDashboardData> {
    return this.paymentDashboard.getDashboard(
      user,
      query,
    );
  }
}