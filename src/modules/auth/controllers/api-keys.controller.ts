import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";

import {
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import {
  CurrentAuthentication,
} from "../../../common/authorization/decorators/current-authentication.decorator.js";

import {
  Authorize,
  CurrentUser,
} from "../../../common/authorization/decorators/index.js";

import type {
  AuthenticationContext,
} from "../../../common/authorization/interfaces/authentication-contenxt.interface.js";

import type {
  AuthenticatedUser,
} from "../../../common/authorization/interfaces/index.js";

import {
  Permissions,
} from "../../../common/authorization/permissions/permissions.registry.js";

import {
  AuthorizationService,
} from "../../../common/authorization/services/authorization.service.js";

import {
  ApiSuccessResponse,
} from "../../../decorators/api-success-response.decorator.js";

import {
  PaginatedResponse,
} from "../../../common/interfaces/paginated.response.js";

import {
  ApiKeyMapper,
} from "../api-key.mapper.js";

import {
  ApiKeyCreatedResponseDto,
} from "../dto/api-key-created.response.dto.js";

import {
  ApiKeyResponseDto,
} from "../dto/api-key.response.dto.js";

import {
  CreateApiKeyDto,
} from "../dto/create-api-key.dto.js";

import {
  FindApiKeysDto,
} from "../dto/find-api-keys.dto.js";

import {
  ApiKeyService,
} from "../services/apikey.service.js";

@ApiTags("API Keys")
@Controller("clients/:clientId/api-keys")
export class ApiKeysController {
  constructor(
    private readonly apiKeys: ApiKeyService,
    private readonly mapper: ApiKeyMapper,
    private readonly authorization: AuthorizationService,
  ) { }

  // ==========================================================================
  // List
  // ==========================================================================

  @Get()
  @Authorize(Permissions.API_KEYS_READ)
  @ApiOperation({
    summary: "Retrieve a client's API keys.",
  })
  async findMany(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Query()
    dto: FindApiKeysDto,
  ): Promise<
    PaginatedResponse<ApiKeyResponseDto>
  > {
    this.ensureClientAccess(
      user,
      clientId,
    );

    const page =
      await this.apiKeys.list(
        clientId,
        {
          page:
            dto.page ?? 1,
          pageSize:
            dto.pageSize ?? 20,
          status:
            dto.status,
        },
      );

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }

  // ==========================================================================
  // Find by ID
  // ==========================================================================

  @Get(":id")
  @Authorize(Permissions.API_KEYS_READ)
  @ApiOperation({
    summary: "Retrieve an API key by ID.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description:
      "API key identifier.",
  })
  @ApiSuccessResponse(
    ApiKeyResponseDto,
  )
  async findById(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,

    @Param(
      "id",
      ParseUUIDPipe,
    )
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ): Promise<ApiKeyResponseDto> {
    this.ensureClientAccess(
      user,
      clientId,
    );

    const apiKey =
      await this.apiKeys.findById(
        id,
        clientId,
      );

    if (!apiKey) {
      throw new NotFoundException(
        "API key not found.",
      );
    }

    return this.mapper.toResponse(
      apiKey,
    );
  }

  // ==========================================================================
  // Create
  // ==========================================================================

  @Post()
  @Authorize(Permissions.API_KEYS_CREATE)
  @ApiOperation({
    summary: "Create an API key.",
  })
  @ApiSuccessResponse(
    ApiKeyCreatedResponseDto,
  )
  async create(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,

    @Body()
    dto: CreateApiKeyDto,

    @CurrentUser()
    user: AuthenticatedUser,

    @CurrentAuthentication()
    authentication: AuthenticationContext,
  ): Promise<ApiKeyCreatedResponseDto> {
    this.ensureClientAccess(
      user,
      clientId,
    );

    return this.apiKeys.create(
      clientId,
      dto.name,
      dto.capabilities,
      user.userId,
      authentication.method,
      dto.expiresAt
        ? new Date(dto.expiresAt)
        : null,
      authentication.ipAddress,
      authentication.userAgent,
    );
  }

  // ==========================================================================
  // Revoke
  // ==========================================================================

  @Post(":id/revoke")
  @Authorize(Permissions.API_KEYS_REVOKE)
  @ApiOperation({
    summary: "Revoke an API key.",
  })
  @ApiParam({
    name: "id",
    description:
      "API key identifier.",
  })
  async revoke(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,

    @Param(
      "id",
      ParseUUIDPipe,
    )
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @CurrentAuthentication()
    authentication: AuthenticationContext,
  ): Promise<void> {
    this.ensureClientAccess(
      user,
      clientId,
    );

    await this.apiKeys.revokeById(
      id,
      clientId,
      user.userId,
      authentication.method,
      authentication.ipAddress,
      authentication.userAgent,
    );
  }

  // ==========================================================================
  // Client access
  // ==========================================================================

  private ensureClientAccess(
    user: AuthenticatedUser,
    clientId: string,
  ): void {
    if (
      !this.authorization.canAccessClient(
        user,
        clientId,
      )
    ) {
      throw new ForbiddenException(
        "You are not authorized to access this client.",
      );
    }
  }
}