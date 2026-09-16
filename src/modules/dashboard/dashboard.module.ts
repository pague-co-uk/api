import {
  Module,
} from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module.js";
import { DashboardRepository } from "../../repositories/DashboardRepository.js";
import {
  DashboardController,
} from "./dashboard.controller.js";
import { DashboardMapper } from "./dashboard.mapper.js";
import { DashboardService } from "./dashboard.service.js";


@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    DashboardController,
  ],

  providers: [
    DashboardService,
    DashboardMapper,
    DashboardRepository,
  ],

  exports: [
    DashboardService,
  ],
})
export class DashboardModule { }