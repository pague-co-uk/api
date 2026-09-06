import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";

import {
  FileInterceptor,
} from "@nestjs/platform-express";

import 'multer';

import {
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import { ApiSuccessResponse } from "../../../decorators/api-success-response.decorator.js";

import { PaginatedResponse } from "../../../common/interfaces/paginated.response.js";
import { ApiPaginatedResponse } from "../../../decorators/api-paginated-response.decorator.js";

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
    summary:
      "Retrieve a paginated list of messages.",
  })
  @ApiPaginatedResponse(
    MessageResponseDto,
  )
  async findMany(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,

    @Query()
    dto: FindMessagesDto,
  ): Promise<
    PaginatedResponse<MessageResponseDto>
  > {
    const page =
      await this.messages.findByClient(
        clientId,
        {
          page:
            dto.page,

          pageSize:
            dto.pageSize,

          search:
            dto.search,

          destination:
            dto.destination,

          senderIdId:
            dto.senderIdId,

          status:
            dto.status,

          encoding:
            dto.encoding,

          submittedFrom:
            dto.submittedFrom
              ? new Date(
                dto.submittedFrom,
              )
              : undefined,

          submittedTo:
            dto.submittedTo
              ? new Date(
                dto.submittedTo,
              )
              : undefined,
        },
      );

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }

  @Get("public/:publicId")
  @Authorize(Permissions.MESSAGES_READ)
  @ApiOperation({
    summary:
      "Retrieve a message by public identifier.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "publicId",
    description:
      "Public message identifier.",
  })
  @ApiSuccessResponse(
    MessageResponseDto,
  )
  @ApiNotFoundResponse({
    description:
      "Message not found.",
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
    summary:
      "Retrieve a message.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description:
      "Message identifier.",
  })
  @ApiSuccessResponse(
    MessageResponseDto,
  )
  @ApiNotFoundResponse({
    description:
      "Message not found.",
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
    summary:
      "Retrieve message status history.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description:
      "Message identifier.",
  })
  async findStatusEvents(
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
    description:
      "Client identifier.",
  })
  @ApiBody({
    type: CreateMessageDto,
  })
  @ApiSuccessResponse(
    MessageResponseDto,
  )
  async create(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,

    @Body()
    dto: CreateMessageDto,
  ) {
    const messages =
      await this.messages.create(
        clientId,
        [dto],
      );

    return this.mapper.toResponse(
      messages[0],
    );
  }

  // -------------------------------------------------------------------------
  // Bulk spreadsheet submission
  // -------------------------------------------------------------------------

  @Post("bulk")
  @Authorize(Permissions.MESSAGES_CREATE)
  @UseInterceptors(
    FileInterceptor("file"),
  )
  @ApiOperation({
    summary:
      "Submit messages from a spreadsheet.",
  })
  @ApiParam({
    name: "clientId",
    description:
      "Client identifier.",
  })
  @ApiConsumes(
    "multipart/form-data",
  )
  @ApiBody({
    schema: {
      type: "object",

      required: [
        "file",
      ],

      properties: {
        file: {
          type: "string",
          format: "binary",
          description:
            "Spreadsheet containing destination, message, senderIdId and encoding columns.",
        },
      },
    },
  })
  async createBulk(
    @Param(
      "clientId",
      ParseUUIDPipe,
    )
    clientId: string,

    @UploadedFile()
    file: Express.Multer.File,
  ) {
    return this.messages.createFromSpreadsheet(
      clientId,
      file,
    );
  }
}