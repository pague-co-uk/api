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

import { CreateServiceDto } from "../dto/create-service.dto.js";
import { FindServicesDto } from "../dto/find-services.dto.js";
import { UpdateServiceDto } from "../dto/update-service.dto.js";
import { ServicesService } from "../services/services.service.js";

@Controller("services")
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
  ) { }

  @Post()
  @Authorize(Permissions.SERVICES_CREATE)
  async create(
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.create(dto);
  }

  @Get()
  @Authorize(Permissions.SERVICES_READ)
  async findMany(
    @Query() dto: FindServicesDto,
  ) {
    return this.servicesService.findMany(dto);
  }

  @Get(":id")
  @Authorize(Permissions.SERVICES_READ)
  async findById(
    @Param("id") id: string,
  ) {
    return this.servicesService.findById(id);
  }

  @Patch(":id")
  @Authorize(Permissions.SERVICES_UPDATE)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(
      id,
      dto,
    );
  }

  @Patch(":id/enable")
  @Authorize(Permissions.SERVICES_ENABLE)
  async enable(
    @Param("id") id: string,
  ) {
    return this.servicesService.updateStatus(
      id,
      {
        status: "ACTIVE",
      },
    );
  }

  @Patch(":id/disable")
  @Authorize(Permissions.SERVICES_DISABLE)
  async disable(
    @Param("id") id: string,
  ) {
    return this.servicesService.updateStatus(
      id,
      {
        status: "DISABLED",
      },
    );
  }
}