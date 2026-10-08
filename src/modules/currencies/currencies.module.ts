import { Module } from "@nestjs/common";

import { CurrenciesController } from "./controllers/currencies.controller.js";
import { CurrenciesRepository } from "./repositories/currencies.repository.js";
import { CurrenciesService } from "./services/currencies.service.js";

@Module({
  controllers: [
    CurrenciesController,
  ],
  providers: [
    CurrenciesRepository,
    CurrenciesService,
  ],
  exports: [
    CurrenciesService,
  ],
})
export class CurrenciesModule { }