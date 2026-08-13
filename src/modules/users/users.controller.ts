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
} from '@nestjs/common';
import {
  ApiBody,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { Authorize } from '../../common/authorization/decorators/authorize.decorator.js';
import { Permissions } from '../../common/authorization/permissions/permissions.registry.js';
import { PaginatedResponse } from '../../common/interfaces/paginated.response.js';
import { ApiPaginatedResponse } from '../../decorators/api-paginated-response.decorator.js';
import { ApiSuccessResponse } from '../../decorators/api-success-response.decorator.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { FindUsersDto } from './dto/find-users.dto.js';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserSummaryResponseDto } from './dto/user-summary.dto.js';
import { UserResponseDto } from './dto/user.response.dto.js';
import { UserMapper } from './user.mapper.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly mapper: UserMapper,
  ) { }

  @Get()
  @Authorize(Permissions.USERS_READ)
  @ApiOperation({
    summary: 'Retrieve a paginated list of users.',
  })
  @ApiPaginatedResponse(UserSummaryResponseDto)
  async findMany(
    @Query() dto: FindUsersDto,
  ): Promise<PaginatedResponse<UserSummaryResponseDto>> {
    const page = await this.users.findMany(dto.toQueryOptions());

    return new PaginatedResponse(this.mapper.toSummaries(page.items), page);
  }

  @Get(':id')
  @Authorize(Permissions.USERS_READ)
  @ApiOperation({
    summary: 'Retrieve a user.',
  })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
  })
  @ApiSuccessResponse(UserResponseDto)
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.mapper.toResponse(await this.users.findById(id));
  }

  @Post()
  @Authorize(Permissions.USERS_CREATE)
  @ApiOperation({
    summary: 'Create a user.',
  })
  @ApiBody({
    type: CreateUserDto,
  })
  @ApiSuccessResponse(UserResponseDto)
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.mapper.toResponse(await this.users.create(dto));
  }

  @Patch(':id')
  @Authorize(Permissions.USERS_UPDATE)
  @ApiOperation({
    summary: 'Update a user.',
  })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
  })
  @ApiBody({
    type: UpdateUserDto,
  })
  @ApiSuccessResponse(UserResponseDto)
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.mapper.toResponse(await this.users.update(id, dto));
  }

  @Delete(':id')
  @Authorize(Permissions.USERS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user.',
  })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
  })
  @ApiNoContentResponse({
    description: 'User deleted successfully.',
  })
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.users.delete(id);
  }

  @Post(':id/activate')
  @Authorize(Permissions.USERS_ACTIVATE)
  @ApiOperation({
    summary: 'Activate a user.',
  })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
  })
  @ApiSuccessResponse(UserResponseDto)
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.mapper.toResponse(await this.users.activate(id));
  }

  @Post(':id/deactivate')
  @Authorize(Permissions.USERS_DEACTIVATE)
  @ApiOperation({
    summary: 'Deactivate a user.',
  })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
  })
  @ApiSuccessResponse(UserResponseDto)
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.mapper.toResponse(await this.users.deactivate(id));
  }

  @Post(':id/unlock')
  @Authorize(Permissions.USERS_UNLOCK)
  @ApiOperation({
    summary: 'Unlock a user.',
  })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
  })
  @ApiSuccessResponse(UserResponseDto)
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  async unlock(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.mapper.toResponse(await this.users.unlock(id));
  }

  @Put(':id/roles')
  @Authorize(Permissions.USERS_ROLES_UPDATE)
  @ApiOperation({
    summary: "Replace a user's role assignments.",
  })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
  })
  @ApiBody({
    type: UpdateUserRolesDto,
  })
  @ApiSuccessResponse(UserResponseDto)
  @ApiNotFoundResponse({
    description: 'User or role not found.',
  })
  async updateRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRolesDto,
  ): Promise<UserResponseDto> {
    return this.mapper.toResponse(
      await this.users.updateRoles(id, dto.roleIds),
    );
  }
}
