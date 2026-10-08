import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query
} from "@nestjs/common";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";

import { CreateClientServiceDto } from "../dto/create-client-service.dto.js";
import { FindClientServicesDto } from "../dto/find-client-services.dto.js";
import { UpdateClientServiceDto } from "../dto/update-client-service.dto.js";
import { ClientServicesService } from "../services/client-services.service.js";

@Controller("clients/:clientId/services")
export class ClientServicesController {
  constructor(
    private readonly clientServicesService: ClientServicesService,
  ) { }

  @Post()
  @Authorize(
    Permissions.CLIENT_SERVICES_CREATE,
  )
  async create(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,
    @Body()
    dto: CreateClientServiceDto,
  ) {
    return this.clientServicesService.create(
      clientId,
      dto,
    );
  }

  @Get()
  @Authorize(
    Permissions.CLIENT_SERVICES_READ,
  )
  async findMany(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,
    @Query()
    dto: FindClientServicesDto,
  ) {
    return this.clientServicesService.findMany(
      clientId,
      dto,
    );
  }

  @Get(":serviceId")
  @Authorize(
    Permissions.CLIENT_SERVICES_READ,
  )
  async findById(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,
    @Param(
      "serviceId",
      ParseUUIDPipe,
    )
    serviceId: string,
  ) {
    return this.clientServicesService.findById(
      clientId,
      serviceId,
    );
  }

  @Patch(":serviceId")
  @Authorize(
    Permissions.CLIENT_SERVICES_UPDATE,
  )
  async update(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,
    @Param(
      "serviceId",
      ParseUUIDPipe,
    )
    serviceId: string,
    @Body()
    dto: UpdateClientServiceDto,
  ) {
    return this.clientServicesService.update(
      clientId,
      serviceId,
      dto,
    );
  }

  @Patch(":serviceId/enable")
  @Authorize(
    Permissions.CLIENT_SERVICES_ENABLE,
  )
  async enable(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,
    @Param(
      "serviceId",
      ParseUUIDPipe,
    )
    serviceId: string,
  ) {
    return this.clientServicesService.enable(
      clientId,
      serviceId,
    );
  }

  @Patch(":serviceId/disable")
  @Authorize(
    Permissions.CLIENT_SERVICES_DISABLE,
  )
  async disable(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,
    @Param(
      "serviceId",
      ParseUUIDPipe,
    )
    serviceId: string,
  ) {
    return this.clientServicesService.disable(
      clientId,
      serviceId,
    );
  }
}