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

import { CreateProviderServiceDto } from "../dto/create-provider-service.dto.js";
import { FindProviderServicesDto } from "../dto/find-provider-services.dto.js";
import { UpdateProviderServiceDto } from "../dto/update-provider-service.dto.js";
import { ProviderServicesService } from "../services/prover-services.service.js";

@Controller("provider-services")
export class ProviderServicesController {
  constructor(
    private readonly providerServicesService: ProviderServicesService,
  ) { }

  @Post()
  @Authorize(
    Permissions.PROVIDER_SERVICES_CREATE,
  )
  async create(
    @Body() dto: CreateProviderServiceDto,
  ) {
    return this.providerServicesService.create(
      dto,
    );
  }

  @Get()
  @Authorize(
    Permissions.PROVIDER_SERVICES_READ,
  )
  async findMany(
    @Query() dto: FindProviderServicesDto,
  ) {
    return this.providerServicesService.findMany(
      dto,
    );
  }

  @Get(":id")
  @Authorize(
    Permissions.PROVIDER_SERVICES_READ,
  )
  async findById(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.providerServicesService.findById(
      id,
    );
  }

  @Patch(":id")
  @Authorize(
    Permissions.PROVIDER_SERVICES_UPDATE,
  )
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderServiceDto,
  ) {
    return this.providerServicesService.update(
      id,
      dto,
    );
  }

  @Patch(":id/enable")
  @Authorize(
    Permissions.PROVIDER_SERVICES_ENABLE,
  )
  async enable(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.providerServicesService.enable(
      id,
    );
  }

  @Patch(":id/disable")
  @Authorize(
    Permissions.PROVIDER_SERVICES_DISABLE,
  )
  async disable(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.providerServicesService.disable(
      id,
    );
  }
}