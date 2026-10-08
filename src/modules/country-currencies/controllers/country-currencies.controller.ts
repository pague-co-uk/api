import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import { CreateCountryCurrencyDto } from "../dto/create-country-currency.dto.js";
import { FindCountryCurrenciesDto } from "../dto/find-country-currencies.dto.js";
import { UpdateCountryCurrencyDto } from "../dto/update-country-currency.dto.js";
import { CountryCurrenciesService } from "../services/county-currencies.service.js";

@Controller("country-currencies")
export class CountryCurrenciesController {
  constructor(
    private readonly countryCurrenciesService: CountryCurrenciesService,
  ) { }

  @Post()
  @Authorize(
    Permissions.COUNTRY_CURRENCIES_CREATE,
  )
  create(
    @Body() dto: CreateCountryCurrencyDto,
  ) {
    return this.countryCurrenciesService.create(dto);
  }

  @Get()
  @Authorize(
    Permissions.COUNTRY_CURRENCIES_READ,
  )
  findMany(
    @Query() dto: FindCountryCurrenciesDto,
  ) {
    return this.countryCurrenciesService.findMany(dto);
  }

  @Get(":countryCode/:currencyId")
  @Authorize(
    Permissions.COUNTRY_CURRENCIES_READ,
  )
  findByCountryAndCurrency(
    @Param("countryCode") countryCode: string,
    @Param("currencyId") currencyId: string,
  ) {
    return this.countryCurrenciesService.findByCountryAndCurrency(
      countryCode,
      currencyId,
    );
  }

  @Patch(":countryCode/:currencyId")
  @Authorize(
    Permissions.COUNTRY_CURRENCIES_UPDATE,
  )
  update(
    @Param("countryCode") countryCode: string,
    @Param("currencyId") currencyId: string,
    @Body() dto: UpdateCountryCurrencyDto,
  ) {
    return this.countryCurrenciesService.update(
      countryCode,
      currencyId,
      dto,
    );
  }

  @Delete(":countryCode/:currencyId")
  @Authorize(
    Permissions.COUNTRY_CURRENCIES_DELETE,
  )
  delete(
    @Param("countryCode") countryCode: string,
    @Param("currencyId") currencyId: string,
  ) {
    return this.countryCurrenciesService.delete(
      countryCode,
      currencyId,
    );
  }
}