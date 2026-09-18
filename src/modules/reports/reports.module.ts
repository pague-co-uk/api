import {
  Module,
} from "@nestjs/common";



import { AuthorizationModule } from "../../common/authorization/authorization.module.js";
import { ReportsRepository } from "../../repositories/reports.repository.js";
import { ClientReportsController } from "./client-reports.controller.js";
import { PlatformReportsController } from "./platform-reports.controller.js";
import { ReportsMapper } from "./reports.mapper.js";
import {
  ReportsService,
} from "./reports.service.js";

@Module({
  controllers: [
    ClientReportsController,
    PlatformReportsController
  ],

  providers: [
    ReportsRepository,
    ReportsService,
    ReportsMapper
  ],

  exports: [
    ReportsService,
  ],
  imports: [AuthorizationModule]
})
export class ReportsModule { }