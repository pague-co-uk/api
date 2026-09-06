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
import { CreateRouteDto } from "../dto/create-route.dto.js";
import { FindRoutesDto } from "../dto/find-routes.dto.js";
import { RouteResponseDto } from "../dto/route.response.dto.js";
import { UpdateRouteDto } from "../dto/update-route.dto.js";
import { RouteMapper } from "../route.mapper.js";
import { RouteService } from "../services/route.service.js";

@ApiTags("Routes")
@Controller("routes")
export class RoutesController {
  constructor(
    private readonly routes: RouteService,
    private readonly mapper: RouteMapper,
  ) { }

  @Get()
  @Authorize(Permissions.ROUTES_READ)
  @ApiOperation({ summary: "Retrieve a paginated list of routes." })
  @ApiPaginatedResponse(RouteResponseDto)
  async findMany(@Query() dto: FindRoutesDto): Promise<PaginatedResponse<RouteResponseDto>> {
    const page = await this.routes.findMany({
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
      clientId: dto.clientId,
      mobileNetworkId: dto.mobileNetworkId,
      connectorId: dto.connectorId,
      status: dto.status,
      search: dto.search,
    });

    return new PaginatedResponse(this.mapper.toResponses(page.items), page);
  }

  @Get(":id")
  @Authorize(Permissions.ROUTES_READ)
  @ApiOperation({ summary: "Retrieve a route." })
  @ApiParam({ name: "id", description: "Route identifier." })
  @ApiSuccessResponse(RouteResponseDto)
  @ApiNotFoundResponse({ description: "Route not found." })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<RouteResponseDto> {
    return this.mapper.toResponse(await this.routes.findById(id));
  }

  @Post()
  @Authorize(Permissions.ROUTES_CREATE)
  @ApiOperation({ summary: "Create a route." })
  @ApiSuccessResponse(RouteResponseDto)
  async create(@Body() dto: CreateRouteDto): Promise<RouteResponseDto> {
    return this.mapper.toResponse(await this.routes.create(dto));
  }

  @Put(":id")
  @Authorize(Permissions.ROUTES_UPDATE)
  @ApiOperation({ summary: "Update a route." })
  @ApiParam({ name: "id", description: "Route identifier." })
  @ApiSuccessResponse(RouteResponseDto)
  @ApiNotFoundResponse({ description: "Route not found." })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRouteDto,
  ): Promise<RouteResponseDto> {
    return this.mapper.toResponse(await this.routes.update(id, dto));
  }

  @Delete(":id")
  @Authorize(Permissions.ROUTES_DELETE)
  @ApiOperation({ summary: "Delete a route." })
  @ApiParam({ name: "id", description: "Route identifier." })
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.routes.delete(id);
  }

  @Post(":id/enable")
  @Authorize(Permissions.ROUTES_ENABLE)
  @ApiOperation({ summary: "Enable a route." })
  @ApiParam({ name: "id", description: "Route identifier." })
  @ApiSuccessResponse(RouteResponseDto)
  async enable(@Param("id", ParseUUIDPipe) id: string): Promise<RouteResponseDto> {
    return this.mapper.toResponse(await this.routes.enable(id));
  }

  @Post(":id/disable")
  @Authorize(Permissions.ROUTES_DISABLE)
  @ApiOperation({ summary: "Disable a route." })
  @ApiParam({ name: "id", description: "Route identifier." })
  @ApiSuccessResponse(RouteResponseDto)
  async disable(@Param("id", ParseUUIDPipe) id: string): Promise<RouteResponseDto> {
    return this.mapper.toResponse(await this.routes.disable(id));
  }
}
