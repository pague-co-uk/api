import {
  Controller,
  Get,
  Query,
} from "@nestjs/common";

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
  FindMessagesDto,
} from "../dto/find-messages.dto.js";

import {
  MessageMapper,
} from "../message.mapper.js";

import {
  MessageService,
} from "../services/message.service.js";

@Controller("messages")
export class PlatformMessagesController {
  constructor(
    private readonly messages: MessageService,
    private readonly mapper: MessageMapper,
  ) { }

  @Get()
  @Authorize(Permissions.MESSAGES_READ)
  async findMany(
    @Query() dto: FindMessagesDto,
  ) {
    const page =
      await this.messages.findManyPlatform({
        page: dto.page,
        pageSize: dto.pageSize,
        clientId: dto.clientId,
        search: dto.search,
        destination: dto.destination,
        senderIdId: dto.senderIdId,
        status: dto.status,
        encoding: dto.encoding,

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
      });

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }
}