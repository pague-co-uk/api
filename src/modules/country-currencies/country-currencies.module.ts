import { Module } from "@nestjs/common";

import { CountryCurrenciesController } from "./controllers/country-currencies.controller.js";
import { CountryCurrenciesRepository } from "./repositories/country-currencies.repository.js";
import { CountryCurrenciesService } from "./services/county-currencies.service.js";

@Module({
  controllers: [
    CountryCurrenciesController,
  ],
  providers: [
    CountryCurrenciesRepository,
    CountryCurrenciesService,
  ],
  exports: [
    CountryCurrenciesService,
  ],
})
export class CountryCurrenciesModule { }