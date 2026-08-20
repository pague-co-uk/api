import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";

import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import { ApiSuccessResponse } from "../../../decorators/api-success-response.decorator.js";

import { CreateMessageDto } from "../dto/create-message.dto.js";
import { FindMessagesDto } from "../dto/find-messages.dto.js";
import { MessageResponseDto } from "../dto/message.response.dto.js";
import { MessageMapper } from "../message.mapper.js";
import { MessageService } from "../services/message.service.js";

@ApiTags("Messages")
@Controller("clients/:clientId/messages")
export class MessagesController {
  constructor(
    private readonly messages: MessageService,
    private readonly mapper: MessageMapper,
  ) { }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  @Get()
  @Authorize(Permissions.MESSAGES_READ)
  @ApiOperation({
    summary: "Retrieve messages for a client.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  async findMany(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,

    @Query() dto: FindMessagesDto,
  ) {
    const messages =
      await this.messages.findByClient(
        clientId,
        {
          limit: dto.limit,
          offset: dto.offset,
          status: dto.status,
        },
      );

    return this.mapper.toResponses(
      messages,
    );
  }

  @Get("public/:publicId")
  @Authorize(Permissions.MESSAGES_READ)
  @ApiOperation({
    summary: "Retrieve a message by public identifier.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiParam({
    name: "publicId",
    description: "Public message identifier.",
  })
  @ApiSuccessResponse(
    MessageResponseDto,
  )
  @ApiNotFoundResponse({
    description: "Message not found.",
  })
  async findByPublicId(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,

    @Param("publicId")
    publicId: string,
  ) {
    return this.mapper.toResponse(
      await this.messages.findByPublicId(
        clientId,
        publicId,
      ),
    );
  }

  @Get(":id")
  @Authorize(Permissions.MESSAGES_READ)
  @ApiOperation({
    summary: "Retrieve a message.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description: "Message identifier.",
  })
  @ApiSuccessResponse(
    MessageResponseDto,
  )
  @ApiNotFoundResponse({
    description: "Message not found.",
  })
  async findById(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,

    @Param("id", ParseUUIDPipe)
    id: string,
  ) {
    return this.mapper.toResponse(
      await this.messages.findById(
        clientId,
        id,
      ),
    );
  }

  @Get(":id/status-events")
  @Authorize(Permissions.MESSAGES_READ)
  @ApiOperation({
    summary: "Retrieve message status history.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description: "Message identifier.",
  })
  async findStatusEvents(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,

    @Param("id", ParseUUIDPipe)
    id: string,
  ) {
    return this.mapper.toStatusResponses(
      await this.messages.findStatusEvents(
        clientId,
        id,
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Submission
  // -------------------------------------------------------------------------

  @Post()
  @Authorize(Permissions.MESSAGES_CREATE)
  @ApiOperation({
    summary: "Submit a message.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiBody({
    type: CreateMessageDto,
  })
  @ApiSuccessResponse(
    MessageResponseDto,
  )
  async create(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,

    @Body() dto: CreateMessageDto,
  ) {
    return this.mapper.toResponse(
      await this.messages.create(
        clientId,
        dto,
      ),
    );
  }
}