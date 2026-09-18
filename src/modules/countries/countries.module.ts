import {
  Module,
} from "@nestjs/common";
import { CountryRepository } from "../../repositories/country.repository.js";
import { CountriesController } from "./countries.controller.js";
import { CountriesService } from "./countries.service.js";

@Module({
  controllers: [
    CountriesController,
  ],

  providers: [
    CountriesService,
    CountryRepository,
  ],

  exports: [
    CountriesService, CountryRepository
  ],
})
export class CountriesModule { }