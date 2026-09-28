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
  Put,
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
import { CurrentUser } from "../../../common/authorization/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../../common/authorization/interfaces/authenticated-user.interface.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import { PaginatedResponse } from "../../../common/interfaces/paginated.response.js";
import { ApiPaginatedResponse } from "../../../decorators/api-paginated-response.decorator.js";
import { ApiSuccessResponse } from "../../../decorators/api-success-response.decorator.js";

import { CreateRoleDto } from "../dto/create-role.dto.js";
import { FindRolesDto } from "../dto/find-roles.dto.js";
import { RoleResponseDto } from "../dto/role.response.dto.js";
import { UpdateRolePermissionsDto } from "../dto/update-role-permissions.dto.js";
import { UpdateRoleDto } from "../dto/update-role.dto.js";
import { RoleMapper } from "../mapper/role.mapper.js";
import { RoleService } from "../services/roles.service.js";

@ApiTags("Roles")
@Controller("roles")
export class RolesController {
  constructor(
    private readonly roles: RoleService,
    private readonly mapper: RoleMapper,
  ) { }

  @Get()
  @Authorize(Permissions.ROLES_READ)
  @ApiOperation({
    summary: "Retrieve a paginated list of roles.",
  })
  @ApiPaginatedResponse(
    RoleResponseDto,
  )
  async findMany(
    @Query()
    dto: FindRolesDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ): Promise<PaginatedResponse<RoleResponseDto>> {
    const page =
      await this.roles.findMany(
        {
          page: dto.page,
          pageSize: dto.pageSize,
          search: dto.search,
        },
        user,
      );

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }

  @Get(":id")
  @Authorize(Permissions.ROLES_READ)
  @ApiOperation({
    summary: "Retrieve a role.",
  })
  @ApiParam({
    name: "id",
    description: "Role identifier.",
  })
  @ApiSuccessResponse(
    RoleResponseDto,
  )
  @ApiNotFoundResponse({
    description: "Role not found.",
  })
  async findById(
    @Param(
      "id",
      ParseUUIDPipe,
    )
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ): Promise<RoleResponseDto> {
    return this.mapper.toResponse(
      await this.roles.findById(
        id,
        user,
      ),
    );
  }

  @Post()
  @Authorize(Permissions.ROLES_CREATE)
  @ApiOperation({
    summary: "Create a role.",
  })
  @ApiBody({
    type: CreateRoleDto,
  })
  @ApiSuccessResponse(
    RoleResponseDto,
  )
  async create(
    @Body()
    dto: CreateRoleDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ): Promise<RoleResponseDto> {
    return this.mapper.toResponse(
      await this.roles.create(
        dto,
        user,
      ),
    );
  }

  @Patch(":id")
  @Authorize(Permissions.ROLES_UPDATE)
  @ApiOperation({
    summary: "Update a role.",
  })
  @ApiParam({
    name: "id",
    description: "Role identifier.",
  })
  @ApiBody({
    type: UpdateRoleDto,
  })
  @ApiSuccessResponse(
    RoleResponseDto,
  )
  @ApiNotFoundResponse({
    description: "Role not found.",
  })
  async update(
    @Param(
      "id",
      ParseUUIDPipe,
    )
    id: string,

    @Body()
    dto: UpdateRoleDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ): Promise<RoleResponseDto> {
    return this.mapper.toResponse(
      await this.roles.update(
        id,
        dto,
        user,
      ),
    );
  }

  @Delete(":id")
  @Authorize(Permissions.ROLES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a role.",
  })
  @ApiParam({
    name: "id",
    description: "Role identifier.",
  })
  @ApiNoContentResponse({
    description: "Role deleted successfully.",
  })
  @ApiNotFoundResponse({
    description: "Role not found.",
  })
  async delete(
    @Param(
      "id",
      ParseUUIDPipe,
    )
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.roles.delete(
      id,
      user,
    );
  }

  @Put(":id/permissions")
  @Authorize(Permissions.ROLES_UPDATE)
  @ApiOperation({
    summary: "Replace a role's permission assignments.",
  })
  @ApiParam({
    name: "id",
    description: "Role identifier.",
  })
  @ApiBody({
    type: UpdateRolePermissionsDto,
  })
  @ApiSuccessResponse(
    RoleResponseDto,
  )
  @ApiNotFoundResponse({
    description:
      "Role or permission not found.",
  })
  async updatePermissions(
    @Param(
      "id",
      ParseUUIDPipe,
    )
    id: string,

    @Body()
    dto: UpdateRolePermissionsDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ): Promise<RoleResponseDto> {
    return this.mapper.toResponse(
      await this.roles.updatePermissions(
        id,
        dto.permissionIds,
        user,
      ),
    );
  }
}