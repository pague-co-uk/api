import {
  Controller,
  Get,
} from "@nestjs/common";

import {
  CountryMapper,
} from "./countries.mapper.js";

import {
  CountriesService,
} from "./countries.service.js";

@Controller("countries")
export class CountriesController {

  constructor(
    private readonly countriesService:
      CountriesService,
  ) { }

  @Get()
  public async findAll() {

    const countries =
      await this.countriesService.findAll();

    return CountryMapper.toResponseList(
      countries,
    );

  }

}