import {
  Controller,
  Get,
  Query,
} from "@nestjs/common";

import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import {
  Authorize,
} from "../../../common/authorization/decorators/index.js";

import {
  Permissions,
} from "../../../common/authorization/permissions/permissions.registry.js";

import {
  PaginatedResponse,
} from "../../../common/interfaces/paginated.response.js";

import {
  ApiKeyMapper,
} from "../api-key.mapper.js";

import {
  ApiKeyResponseDto,
} from "../dto/api-key.response.dto.js";

import {
  FindApiKeysDto,
} from "../dto/find-api-keys.dto.js";

import {
  ApiKeyService,
} from "../services/apikey.service.js";

@ApiTags("API Keys")
@Controller("api-keys")
export class PlatformApiKeysController {
  constructor(
    private readonly apiKeys: ApiKeyService,
    private readonly mapper: ApiKeyMapper,
  ) { }

  // ==========================================================================
  // List
  // ==========================================================================

  @Get()
  @Authorize(Permissions.API_KEYS_READ)
  @ApiOperation({
    summary:
      "Retrieve API keys across clients.",
  })
  async findMany(
    @Query()
    dto: FindApiKeysDto,
  ): Promise<
    PaginatedResponse<ApiKeyResponseDto>
  > {
    const page =
      await this.apiKeys.listPlatform({
        page:
          dto.page ?? 1,
        pageSize:
          dto.pageSize ?? 20,
        clientId:
          dto.clientId,
        status:
          dto.status,
        search:
          dto.search,
      });

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }
}