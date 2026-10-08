import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";

import { CreatePaymentProviderDto } from "../dto/create-payment-provider.dto.js";
import { FindPaymentProvidersDto } from "../dto/find-payment-providers.dto.js";
import { UpdatePaymentProviderDto } from "../dto/update-payment-provider.dto.js";

import { PaymentProvidersService } from "../services/payment-providers.service.js";

@Controller("payment-providers")
export class PaymentProvidersController {
  constructor(
    private readonly paymentProvidersService: PaymentProvidersService,
  ) { }

  @Post()
  @Authorize(
    Permissions.PAYMENT_PROVIDERS_CREATE,
  )
  async create(
    @Body() dto: CreatePaymentProviderDto,
  ) {
    return this.paymentProvidersService.create(
      dto,
    );
  }

  @Get()
  @Authorize(
    Permissions.PAYMENT_PROVIDERS_READ,
  )
  async findMany(
    @Query() dto: FindPaymentProvidersDto,
  ) {
    return this.paymentProvidersService.findMany(
      dto,
    );
  }

  @Get(":id")
  @Authorize(
    Permissions.PAYMENT_PROVIDERS_READ,
  )
  async findById(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.paymentProvidersService.findById(
      id,
    );
  }

  @Patch(":id")
  @Authorize(
    Permissions.PAYMENT_PROVIDERS_UPDATE,
  )
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentProviderDto,
  ) {
    return this.paymentProvidersService.update(
      id,
      dto,
    );
  }

  @Patch(":id/enable")
  @Authorize(
    Permissions.PAYMENT_PROVIDERS_ENABLE,
  )
  async enable(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.paymentProvidersService.enable(
      id,
    );
  }

  @Patch(":id/disable")
  @Authorize(
    Permissions.PAYMENT_PROVIDERS_DISABLE,
  )
  async disable(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.paymentProvidersService.disable(
      id,
    );
  }
}