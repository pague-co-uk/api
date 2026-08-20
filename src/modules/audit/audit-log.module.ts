import { Module } from "@nestjs/common";

import { AuditLogRepository } from "../../repositories/auditLogRepository.js";

import { AuditLogMapper } from "./audit-log.mapper.js";
import { AuditLogController } from "./controllers/audit-log.controller.js";
import { AuditLogService } from "./services/audit-log.service.js";

@Module({
  controllers: [
    AuditLogController,
  ],

  providers: [
    AuditLogRepository,
    AuditLogService,
    AuditLogMapper,
  ],

  exports: [
    AuditLogService,
  ],
})
export class AuditLogModule { }