import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import {
  ApiBody,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import {
  Authorize,
} from "../../../common/authorization/decorators/authorize.decorator.js";

import {
  Permissions,
} from "../../../common/authorization/permissions/permissions.registry.js";

import type {
  AuthenticatedRequest,
} from "../../../common/authorization/interfaces/authenticated-request.interface.js";

import {
  CreateApiMessageDto,
} from "../dto/create-api-message.dto.js";

import {
  MessageStatusResponseDto,
} from "../dto/message-status.dto.js";

import { MessageMapper } from "../message.mapper.js";
import {
  MessageService,
} from "../services/message.service.js";

@ApiTags("Messaging API")
@Controller("messages")
export class MessagesApiController {
  constructor(
    private readonly messages:
      MessageService,

    private readonly mapper:
      MessageMapper,
  ) { }

  @Post("send")
  @Authorize(
    Permissions.MESSAGES_CREATE,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Submit one or more SMS messages.",
  })
  @ApiBody({
    type: CreateApiMessageDto,
    isArray: true,
  })
  async send(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    dtos: CreateApiMessageDto[],
  ) {
    const clientId =
      request.auth?.apiKey?.clientId;

    if (!clientId) {
      throw new UnauthorizedException(
        "API key client is not available.",
      );
    }

    const messages =
      await this.messages.create(
        clientId,
        dtos,
      );

    return {
      messages:
        messages.map(
          (message) => ({
            publicId:
              message.publicId,
          }),
        ),
    };
  }

  @Get(":publicId/status")
  @Authorize(
    Permissions.MESSAGES_STATUS_READ,
  )
  @ApiOperation({
    summary:
      "Get message status.",
  })
  async getStatus(
    @Req()
    request: AuthenticatedRequest,

    @Param("publicId")
    publicId: string,
  ): Promise<MessageStatusResponseDto> {
    const clientId =
      request.auth?.apiKey?.clientId;

    if (!clientId) {
      throw new UnauthorizedException(
        "API key client is not available.",
      );
    }

    const message =
      await this.messages.findDetailsByPublicId(
        clientId,
        publicId,
      );

    return this.mapper.toMessageStatusResponse(
      message,
    );
  }
}