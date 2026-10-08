import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import { CreateCurrencyDto } from "../dto/create-currency.dto.js";
import { FindCurrenciesDto } from "../dto/find-currencies.dto.js";
import { UpdateCurrencyDto } from "../dto/update-currency.dto.js";
import { CurrenciesService } from "../services/currencies.service.js";

@Controller("currencies")
export class CurrenciesController {
  constructor(
    private readonly currenciesService: CurrenciesService,
  ) { }

  @Post()
  @Authorize(
    Permissions.CURRENCIES_CREATE,
  )
  create(
    @Body() dto: CreateCurrencyDto,
  ) {
    return this.currenciesService.create(
      dto,
    );
  }

  @Get()
  @Authorize(
    Permissions.CURRENCIES_READ,
  )
  findMany(
    @Query() dto: FindCurrenciesDto,
  ) {
    return this.currenciesService.findMany(
      dto,
    );
  }

  @Get(":id")
  @Authorize(
    Permissions.CURRENCIES_READ,
  )
  findById(
    @Param("id") id: string,
  ) {
    return this.currenciesService.findById(
      id,
    );
  }

  @Patch(":id")
  @Authorize(
    Permissions.CURRENCIES_UPDATE,
  )
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCurrencyDto,
  ) {
    return this.currenciesService.update(
      id,
      dto,
    );
  }

  @Patch(":id/enable")
  @Authorize(
    Permissions.CURRENCIES_ENABLE,
  )
  enable(
    @Param("id") id: string,
  ) {
    return this.currenciesService.enable(
      id,
    );
  }

  @Patch(":id/disable")
  @Authorize(
    Permissions.CURRENCIES_DISABLE,
  )
  disable(
    @Param("id") id: string,
  ) {
    return this.currenciesService.disable(
      id,
    );
  }
}