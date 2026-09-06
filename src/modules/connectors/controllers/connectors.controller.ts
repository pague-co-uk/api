import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import { PaginatedResponse } from "../../../common/interfaces/paginated.response.js";
import { ApiPaginatedResponse } from "../../../decorators/api-paginated-response.decorator.js";
import { ApiSuccessResponse } from "../../../decorators/api-success-response.decorator.js";
import { ConnectorMapper } from "../connector.mapper.js";
import { ConnectorResponseDto } from "../dto/connector.response.dto.js";
import { CreateConnectorDto } from "../dto/create-connector.dto.js";
import { FindConnectorsDto } from "../dto/find-connectors.dto.js";
import { UpdateConnectorDto } from "../dto/update-connector.dto.js";
import { ConnectorService } from "../services/connector.service.js";

@ApiTags("Connectors")
@Controller("connectors")
export class ConnectorsController {
  constructor(
    private readonly connectors: ConnectorService,
    private readonly mapper: ConnectorMapper,
  ) { }

  @Get()
  @Authorize(Permissions.CONNECTORS_READ)
  @ApiOperation({ summary: "Retrieve a paginated list of connectors." })
  @ApiPaginatedResponse(ConnectorResponseDto)
  async findMany(@Query() dto: FindConnectorsDto): Promise<PaginatedResponse<ConnectorResponseDto>> {
    const page = await this.connectors.findMany({
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
      status: dto.status,
      transport: dto.transport,
      provider: dto.provider,
      search: dto.search,
    });

    return new PaginatedResponse(this.mapper.toResponses(page.items), page);
  }

  @Get(":id")
  @Authorize(Permissions.CONNECTORS_READ)
  @ApiOperation({ summary: "Retrieve a connector." })
  @ApiParam({ name: "id", description: "Connector identifier." })
  @ApiSuccessResponse(ConnectorResponseDto)
  @ApiNotFoundResponse({ description: "Connector not found." })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<ConnectorResponseDto> {
    return this.mapper.toResponse(await this.connectors.findById(id));
  }

  @Post()
  @Authorize(Permissions.CONNECTORS_CREATE)
  @ApiOperation({ summary: "Create a connector." })
  @ApiSuccessResponse(ConnectorResponseDto)
  async create(@Body() dto: CreateConnectorDto): Promise<ConnectorResponseDto> {
    return this.mapper.toResponse(await this.connectors.create(dto));
  }

  @Put(":id")
  @Authorize(Permissions.CONNECTORS_UPDATE)
  @ApiOperation({ summary: "Update a connector." })
  @ApiParam({ name: "id", description: "Connector identifier." })
  @ApiSuccessResponse(ConnectorResponseDto)
  @ApiNotFoundResponse({ description: "Connector not found." })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateConnectorDto,
  ): Promise<ConnectorResponseDto> {
    return this.mapper.toResponse(await this.connectors.update(id, dto));
  }

  @Delete(":id")
  @Authorize(Permissions.CONNECTORS_DELETE)
  @ApiOperation({ summary: "Delete a connector." })
  @ApiParam({ name: "id", description: "Connector identifier." })
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.connectors.delete(id);
  }

  @Post(":id/enable")
  @Authorize(Permissions.CONNECTORS_ENABLE)
  @ApiOperation({ summary: "Enable a connector." })
  @ApiParam({ name: "id", description: "Connector identifier." })
  @ApiSuccessResponse(ConnectorResponseDto)
  async enable(@Param("id", ParseUUIDPipe) id: string): Promise<ConnectorResponseDto> {
    return this.mapper.toResponse(await this.connectors.enable(id));
  }

  @Post(":id/disable")
  @Authorize(Permissions.CONNECTORS_DISABLE)
  @ApiOperation({ summary: "Disable a connector." })
  @ApiParam({ name: "id", description: "Connector identifier." })
  @ApiSuccessResponse(ConnectorResponseDto)
  async disable(@Param("id", ParseUUIDPipe) id: string): Promise<ConnectorResponseDto> {
    return this.mapper.toResponse(await this.connectors.disable(id));
  }

  @Post(":id/suspend")
  @Authorize(Permissions.CONNECTORS_SUSPEND)
  @ApiOperation({ summary: "Suspend a connector." })
  @ApiParam({ name: "id", description: "Connector identifier." })
  @ApiSuccessResponse(ConnectorResponseDto)
  async suspend(@Param("id", ParseUUIDPipe) id: string): Promise<ConnectorResponseDto> {
    return this.mapper.toResponse(await this.connectors.suspend(id));
  }
}
