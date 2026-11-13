import { CurrentUser } from "../../../common/authorization/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../../common/authorization/interfaces/authenticated-user.interface.js";
import { messageDateRange } from "../dto/message-date-range.js";
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

  @Get("filter-options")
  @Authorize(Permissions.MESSAGES_READ)
  async filterOptions(@Query() dto: FindMessagesDto, @CurrentUser() user: AuthenticatedUser) {
    const options = await this.messages.getPlatformFilterOptions(user);
    return {
      clients: options.clients,
      senderIds: dto.clientId ? options.senderIds.filter(sender => sender.clientId === dto.clientId) : options.senderIds,
    };
  }

  @Get()
  @Authorize(Permissions.MESSAGES_READ)
  async findMany(
    @Query() dto: FindMessagesDto,
  ) {
    const page =
      await this.messages.findManyPlatform({
        ...messageDateRange(dto),
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