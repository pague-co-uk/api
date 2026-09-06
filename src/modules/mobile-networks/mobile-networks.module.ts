import { Module } from "@nestjs/common";

import { AuditModule } from "../../audit/audit.module.js";
import { MobileNetworkRepository } from "../../repositories/MobileNetworkRepository.js";
import { MobileNetworksController } from "./controllers/mobile-networks.controller.js";
import { MobileNetworkMapper } from "./mobile-network.mapper.js";
import { MobileNetworkService } from "./services/mobile-network.service.js";

@Module({
  imports: [AuditModule],
  controllers: [MobileNetworksController],
  providers: [MobileNetworkRepository, MobileNetworkService, MobileNetworkMapper],
  exports: [MobileNetworkService, MobileNetworkRepository],
})
export class MobileNetworksModule { }
