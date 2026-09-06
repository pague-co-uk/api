import { Module } from "@nestjs/common";

import { AuditModule } from "../../audit/audit.module.js";
import { ClientRepository } from "../../repositories/ClientRepository.js";
import { ConnectorRepository } from "../../repositories/ConnectorRepository.js";
import { MobileNetworkRepository } from "../../repositories/MobileNetworkRepository.js";
import { RouteRepository } from "../../repositories/RouteRepository.js";
import { RoutesController } from "./controllers/routes.controller.js";
import { RouteMapper } from "./route.mapper.js";
import { RouteService } from "./services/route.service.js";

@Module({
  imports: [AuditModule],
  controllers: [RoutesController],
  providers: [
    RouteRepository,
    ClientRepository,
    MobileNetworkRepository,
    ConnectorRepository,
    RouteService,
    RouteMapper,
  ],
  exports: [RouteService, RouteRepository],
})
export class RoutesModule { }
