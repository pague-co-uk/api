import { Module } from "@nestjs/common";

import { AuditModule } from "../../audit/audit.module.js";
import { ConnectorRepository } from "../../repositories/ConnectorRepository.js";
import { ConnectorMapper } from "./connector.mapper.js";
import { ConnectorsController } from "./controllers/connectors.controller.js";
import { ConnectorService } from "./services/connector.service.js";

@Module({
  imports: [AuditModule],
  controllers: [ConnectorsController],
  providers: [ConnectorRepository, ConnectorService, ConnectorMapper],
  exports: [ConnectorService, ConnectorRepository],
})
export class ConnectorsModule { }
