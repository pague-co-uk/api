import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBody,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { PaginatedResponse } from "../../../common/interfaces/paginated.response.js";
import { ApiPaginatedResponse } from "../../../decorators/api-paginated-response.decorator.js";
import { ApiSuccessResponse } from "../../../decorators/api-success-response.decorator.js";

import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import { ClientMapper } from "../client.mapper.js";
import { ClientSummaryResponseDto } from "../dto/client-summary.response.dto.js";
import { ClientResponseDto } from "../dto/client.response.dto.js";
import { CreateClientDto } from "../dto/create-client.dto.js";
import { FindClientsDto } from "../dto/find-clients.dto.js";
import { UpdateClientDto } from "../dto/update-client.dto.js";
import { ClientService } from "../services/clients.service.js";

@ApiTags("Clients")
@Controller("clients")
export class ClientsController {
  constructor(
    private readonly clients: ClientService,
    private readonly mapper: ClientMapper,
  ) { }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  @Get()
  @Authorize(Permissions.CLIENTS_READ)
  @ApiOperation({
    summary: "Retrieve a paginated list of clients.",
  })
  @ApiPaginatedResponse(
    ClientSummaryResponseDto,
  )
  async findMany(
    @Query() dto: FindClientsDto,
  ): Promise<PaginatedResponse<ClientSummaryResponseDto>> {
    const page =
      await this.clients.findMany({
        page: dto.page,
        pageSize: dto.pageSize,
        search: dto.search,
        status: dto.status,
      });

    return new PaginatedResponse(
      this.mapper.toSummaries(page.items),
      page,
    );
  }

  @Get(":id")
  @Authorize(Permissions.CLIENTS_READ)
  @ApiOperation({
    summary: "Retrieve a client.",
  })
  @ApiParam({
    name: "id",
    description: "Client identifier.",
  })
  @ApiSuccessResponse(ClientResponseDto)
  @ApiNotFoundResponse({
    description: "Client not found.",
  })
  async findById(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ClientResponseDto> {
    return this.mapper.toResponse(
      await this.clients.findById(id),
    );
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  @Post()
  @Authorize(Permissions.CLIENTS_CREATE)
  @ApiOperation({
    summary: "Create a client.",
  })
  @ApiBody({
    type: CreateClientDto,
  })
  @ApiSuccessResponse(ClientResponseDto)
  async create(
    @Body() dto: CreateClientDto,
  ): Promise<ClientResponseDto> {
    return this.mapper.toResponse(
      await this.clients.create(dto),
    );
  }

  @Patch(":id")
  @Authorize(Permissions.CLIENTS_UPDATE)
  @ApiOperation({
    summary: "Update a client.",
  })
  @ApiParam({
    name: "id",
    description: "Client identifier.",
  })
  @ApiBody({
    type: UpdateClientDto,
  })
  @ApiSuccessResponse(ClientResponseDto)
  @ApiNotFoundResponse({
    description: "Client not found.",
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    return this.mapper.toResponse(
      await this.clients.update(id, dto),
    );
  }

  @Delete(":id")
  @Authorize(Permissions.CLIENTS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a client.",
  })
  @ApiParam({
    name: "id",
    description: "Client identifier.",
  })
  @ApiNoContentResponse({
    description: "Client deleted successfully.",
  })
  @ApiNotFoundResponse({
    description: "Client not found.",
  })
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.clients.delete(id);
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  @Post(":id/activate")
  @Authorize(Permissions.CLIENTS_ACTIVATE)
  @ApiOperation({
    summary: "Activate a client.",
  })
  @ApiParam({
    name: "id",
    description: "Client identifier.",
  })
  @ApiSuccessResponse(ClientResponseDto)
  @ApiNotFoundResponse({
    description: "Client not found.",
  })
  async activate(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ClientResponseDto> {
    return this.mapper.toResponse(
      await this.clients.activate(id),
    );
  }

  @Post(":id/suspend")
  @Authorize(Permissions.CLIENTS_SUSPEND)
  @ApiOperation({
    summary: "Suspend a client.",
  })
  @ApiParam({
    name: "id",
    description: "Client identifier.",
  })
  @ApiSuccessResponse(ClientResponseDto)
  @ApiNotFoundResponse({
    description: "Client not found.",
  })
  async suspend(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ClientResponseDto> {
    return this.mapper.toResponse(
      await this.clients.suspend(id),
    );
  }

  @Post(":id/disable")
  @Authorize(Permissions.CLIENTS_DISABLE)
  @ApiOperation({
    summary: "Disable a client.",
  })
  @ApiParam({
    name: "id",
    description: "Client identifier.",
  })
  @ApiSuccessResponse(ClientResponseDto)
  @ApiNotFoundResponse({
    description: "Client not found.",
  })
  async disable(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ClientResponseDto> {
    return this.mapper.toResponse(
      await this.clients.disable(id),
    );
  }
}