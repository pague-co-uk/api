import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module.js";
import { ClientServicesController } from "./controllers/client-service.controller.js";
import { ClientServicesRepository } from "./repositories/client-services.repository.js";
import { ClientServicesService } from "./services/client-services.service.js";

@Module({
  controllers: [
    ClientServicesController,
  ],

  imports: [DatabaseModule],
  providers: [
    ClientServicesRepository,
    ClientServicesService,
  ],

  exports: [
    ClientServicesService,
  ],
})
export class ClientServicesModule { }