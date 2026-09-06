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
} from "../../../common/authorization/decorators/authorize.decorator.js";

import {
  Permissions,
} from "../../../common/authorization/permissions/permissions.registry.js";

import {
  PaginatedResponse,
} from "../../../common/interfaces/paginated.response.js";

import {
  ApiPaginatedResponse,
} from "../../../decorators/api-paginated-response.decorator.js";

import {
  FindWebhooksDto,
} from "../dto/find-webhooks.dto.js";

import {
  WebhookResponseDto,
} from "../dto/webhook-response.dto.js";

import {
  WebhookMapper,
} from "../webhook.mapper.js";

import {
  WebhookService,
} from "../services/webhook.service.js";

@ApiTags("Webhooks")
@Controller("webhooks")
export class PlatformWebhooksController {

  constructor(
    private readonly webhooks:
      WebhookService,

    private readonly mapper:
      WebhookMapper,
  ) { }

  // ==========================================================================
  // List
  // ==========================================================================

  @Get()
  @Authorize(
    Permissions.WEBHOOKS_READ,
  )
  @ApiOperation({
    summary:
      "Retrieve webhook endpoints across clients.",
  })
  @ApiPaginatedResponse(
    WebhookResponseDto,
  )
  async findMany(
    @Query()
    dto: FindWebhooksDto,
  ): Promise<
    PaginatedResponse<WebhookResponseDto>
  > {
    const page =
      await this.webhooks.listPlatform({
        page:
          dto.page ?? 1,

        pageSize:
          dto.pageSize ?? 20,

        clientId:
          dto.clientId,

        enabled:
          dto.enabled,

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