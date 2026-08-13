import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import {
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
import { FindPermissionsDto } from "../dto/find-permissions.dto.js";
import { PermissionResponseDto } from "../dto/permission.response.dto.js";
import { PermissionMapper } from "../permission.mapper.js";
import { PermissionService } from "../services/permission.service.js";

@ApiTags("Permissions")
@Controller("permissions")
export class PermissionsController {
  constructor(
    private readonly permissions: PermissionService,
    private readonly mapper: PermissionMapper,
  ) { }

  @Get()
  @Authorize(Permissions.PERMISSIONS_READ)
  @ApiOperation({
    summary: "Retrieve a paginated list of permissions.",
  })
  @ApiPaginatedResponse(
    PermissionResponseDto,
  )
  async findMany(
    @Query() dto: FindPermissionsDto,
  ): Promise<PaginatedResponse<PermissionResponseDto>> {
    const page =
      await this.permissions.findMany({
        page: dto.page,
        pageSize: dto.pageSize,
        module: dto.module,
        search: dto.search,
      });

    return new PaginatedResponse(
      this.mapper.toResponses(page.items),
      page,
    );
  }

  @Get(":id")
  @Authorize(Permissions.PERMISSIONS_READ)
  @ApiOperation({
    summary: "Retrieve a permission.",
  })
  @ApiParam({
    name: "id",
    description: "Permission identifier.",
  })
  @ApiSuccessResponse(
    PermissionResponseDto,
  )
  @ApiNotFoundResponse({
    description: "Permission not found.",
  })
  async findById(
    @Param("id", ParseUUIDPipe)
    id: string,
  ): Promise<PermissionResponseDto> {
    return this.mapper.toResponse(
      await this.permissions.findById(id),
    );
  }
}