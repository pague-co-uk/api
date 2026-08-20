import { Module } from "@nestjs/common";

import { AuditModule } from "../../audit/audit.module.js";
import { ClientRepository } from "../../repositories/ClientRepository.js";

import { ClientMapper } from "./client.mapper.js";
import { ClientsController } from "./controllers/clients.controller.js";
import { ClientService } from "./services/clients.service.js";

@Module({
  imports: [
    AuditModule,
  ],
  controllers: [
    ClientsController,
  ],
  providers: [
    ClientRepository,
    ClientMapper,
    ClientService,
  ],
  exports: [
    ClientService,
    ClientRepository,
  ],
})
export class ClientsModule { }