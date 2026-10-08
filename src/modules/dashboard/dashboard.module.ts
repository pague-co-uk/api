import {
  Module,
} from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module.js";
import { DashboardRepository } from "../../repositories/DashboardRepository.js";
import { PaymentDashboardRepository } from "../../repositories/PaymentDashboardRepository.js";
import { PaymentDashboardController } from "./controllers/payment-dashboard.controller.js";
import {
  DashboardController,
} from "./dashboard.controller.js";
import { DashboardMapper } from "./dashboard.mapper.js";
import { DashboardService } from "./dashboard.service.js";
import { PaymentDashboardService } from "./services/payment-dashboard.service.js";


@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    DashboardController,
    PaymentDashboardController,
  ],

  providers: [
    DashboardService,
    PaymentDashboardService,
    PaymentDashboardRepository,
    DashboardMapper,
    DashboardRepository,
  ],

  exports: [
    DashboardService,
  ],
})
export class DashboardModule { }