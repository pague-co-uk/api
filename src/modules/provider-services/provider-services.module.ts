import { Module } from "@nestjs/common";

import { ProviderServicesController } from "./controllers/provider-services.controller.js";
import { ProviderServicesRepository } from "./repositories/provider-services.repository.js";
import { ProviderServicesService } from "./services/prover-services.service.js";

@Module({
  controllers: [
    ProviderServicesController,
  ],

  providers: [
    ProviderServicesRepository,
    ProviderServicesService,
  ],

  exports: [
    ProviderServicesService,
  ],
})
export class ProviderServicesModule { }