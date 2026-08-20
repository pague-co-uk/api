import {
  Body,
  Controller,
  Delete,
  Get,
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

import {
  Authorize,
} from "../../../common/authorization/decorators/authorize.decorator.js";

import {
  Permissions,
} from "../../../common/authorization/permissions/permissions.registry.js";

import {
  ApiSuccessResponse,
} from "../../../decorators/api-success-response.decorator.js";

import {
  CreateWebhookDto,
} from "../dto/create-webhook.dto.js";

import {
  FindWebhooksDto,
} from "../dto/find-webhooks.dto.js";

import {
  UpdateWebhookDto,
} from "../dto/update-webhook.dto.js";

import {
  WebhookMapper,
} from "../webhook.mapper.js";

import {
  WebhookSecretResponseDto,
} from "../dto/webhook-secret.response.dto.js";

import {
  WebhookResponseDto,
} from "../dto/webhook-response.dto.js";

import { FindWebhookDeliveriesDto } from "../dto/find-webhook-deliveries.dto.js";
import { WebhookDeliveryResponseDto } from "../dto/webhook-delivery.response.dto.js";
import {
  WebhookService,
} from "../services/webhook.service.js";

@ApiTags("Webhooks")
@Controller(
  "clients/:clientId/webhooks",
)
export class WebhooksController {
  constructor(
    private readonly webhooks:
      WebhookService,

    private readonly mapper:
      WebhookMapper,
  ) { }

  // =========================================================================
  // Queries
  // =========================================================================

  @Get()
  @Authorize(
    Permissions.WEBHOOKS_READ,
  )
  @ApiOperation({
    summary:
      "Retrieve webhook endpoints for a client.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  async findMany(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,

    @Query()
    dto: FindWebhooksDto,
  ) {
    const webhooks =
      await this.webhooks.findByClient(
        clientId,
        {
          limit:
            dto.limit,

          offset:
            dto.offset,

          enabled:
            dto.enabled,
        },
      );

    return this.mapper.toResponses(
      webhooks,
    );
  }

  @Get("public/:publicId")
  @Authorize(
    Permissions.WEBHOOKS_READ,
  )
  @ApiOperation({
    summary:
      "Retrieve a webhook endpoint by public identifier.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "publicId",
    description:
      "Public webhook identifier.",
  })
  @ApiSuccessResponse(
    WebhookResponseDto,
  )
  @ApiNotFoundResponse({
    description:
      "Webhook endpoint not found.",
  })
  async findByPublicId(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,

    @Param("publicId")
    publicId: string,
  ) {
    const webhook =
      await this.webhooks.findByPublicId(
        clientId,
        publicId,
      );

    return this.mapper.toResponse(
      webhook,
    );
  }

  @Get(":id")
  @Authorize(
    Permissions.WEBHOOKS_READ,
  )
  @ApiOperation({
    summary:
      "Retrieve a webhook endpoint.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description:
      "Webhook endpoint identifier.",
  })
  @ApiSuccessResponse(
    WebhookResponseDto,
  )
  @ApiNotFoundResponse({
    description:
      "Webhook endpoint not found.",
  })
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
  ) {
    const webhook =
      await this.webhooks.findById(
        clientId,
        id,
      );

    return this.mapper.toResponse(
      webhook,
    );
  }

  // =========================================================================
  // Create
  // =========================================================================

  @Post()
  @Authorize(
    Permissions.WEBHOOKS_CREATE,
  )
  @ApiOperation({
    summary:
      "Create a webhook endpoint.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiBody({
    type: CreateWebhookDto,
  })
  @ApiSuccessResponse(
    WebhookSecretResponseDto,
  )
  async create(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,

    @Body()
    dto: CreateWebhookDto,
  ) {
    const result =
      await this.webhooks.create(
        clientId,
        {
          name:
            dto.name,

          url:
            dto.url,
        },
      );

    return this.mapper.toSecretResponse(
      result.webhook,
      result.secret,
    );
  }

  // =========================================================================
  // Update
  // =========================================================================

  @Patch(":id")
  @Authorize(
    Permissions.WEBHOOKS_UPDATE,
  )
  @ApiOperation({
    summary:
      "Update a webhook endpoint.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description:
      "Webhook endpoint identifier.",
  })
  @ApiBody({
    type: UpdateWebhookDto,
  })
  @ApiSuccessResponse(
    WebhookResponseDto,
  )
  async update(
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

    @Body()
    dto: UpdateWebhookDto,
  ) {
    const webhook =
      await this.webhooks.update(
        clientId,
        id,
        {
          ...(dto.name !==
            undefined
            ? {
              name:
                dto.name,
            }
            : {}),

          ...(dto.url !==
            undefined
            ? {
              url:
                dto.url,
            }
            : {}),
        },
      );

    return this.mapper.toResponse(
      webhook,
    );
  }

  // =========================================================================
  // Enable
  // =========================================================================

  @Post(":id/enable")
  @Authorize(
    Permissions.WEBHOOKS_UPDATE,
  )
  @ApiOperation({
    summary:
      "Enable a webhook endpoint.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description:
      "Webhook endpoint identifier.",
  })
  @ApiSuccessResponse(
    WebhookResponseDto,
  )
  async enable(
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
  ) {
    const webhook =
      await this.webhooks.setEnabled(
        clientId,
        id,
        true,
      );

    return this.mapper.toResponse(
      webhook,
    );
  }

  // =========================================================================
  // Disable
  // =========================================================================

  @Post(":id/disable")
  @Authorize(
    Permissions.WEBHOOKS_UPDATE,
  )
  @ApiOperation({
    summary:
      "Disable a webhook endpoint.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description:
      "Webhook endpoint identifier.",
  })
  @ApiSuccessResponse(
    WebhookResponseDto,
  )
  async disable(
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
  ) {
    const webhook =
      await this.webhooks.setEnabled(
        clientId,
        id,
        false,
      );

    return this.mapper.toResponse(
      webhook,
    );
  }

  // =========================================================================
  // Rotate secret
  // =========================================================================

  @Post(":id/rotate-secret")
  @Authorize(
    Permissions.WEBHOOKS_ROTATE_SECRET,
  )
  @ApiOperation({
    summary:
      "Rotate a webhook signing secret.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description:
      "Webhook endpoint identifier.",
  })
  @ApiSuccessResponse(
    WebhookSecretResponseDto,
  )
  async rotateSecret(
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
  ) {
    const result =
      await this.webhooks.rotateSecret(
        clientId,
        id,
      );

    return this.mapper.toSecretResponse(
      result.webhook,
      result.secret,
    );
  }

  // =========================================================================
  // Delete
  // =========================================================================

  @Delete(":id")
  @Authorize(
    Permissions.WEBHOOKS_DELETE,
  )
  @ApiOperation({
    summary:
      "Delete a webhook endpoint.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description:
      "Webhook endpoint identifier.",
  })
  @ApiNoContentResponse({
    description:
      "Webhook endpoint deleted.",
  })
  async delete(
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
  ) {
    await this.webhooks.delete(
      clientId,
      id,
    );
  }

  //=========================================================================
  // Deliveries
  // =========================================================================
  @Get(":id/deliveries")
  @Authorize(
    Permissions.WEBHOOKS_DELIVERIES_READ,
  )
  @ApiOperation({
    summary:
      "Retrieve webhook delivery history.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description:
      "Webhook endpoint identifier.",
  })
  @ApiSuccessResponse(
    WebhookDeliveryResponseDto,
  )
  async findDeliveries(
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

    @Query()
    dto: FindWebhookDeliveriesDto,
  ) {
    const deliveries =
      await this.webhooks.findDeliveries(
        clientId,
        id,
        {
          limit:
            dto.limit,

          offset:
            dto.offset,
        },
      );

    return this.mapper.toDeliveryResponses(
      deliveries,
    );
  }
}