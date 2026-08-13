import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import { PaginatedResponse } from "../../../common/interfaces/paginated.response.js";
import { ApiPaginatedResponse } from "../../../decorators/api-paginated-response.decorator.js";
import { ApiSuccessResponse } from "../../../decorators/api-success-response.decorator.js";

import { CreateSenderIdDto } from "../dto/create-sender-id.dto.js";
import { FindSenderIdsDto } from "../dto/find-sender-ids.dto.js";
import { SenderIdResponseDto } from "../dto/sender-id.response.dto.js";
import { UpdateSenderIdDto } from "../dto/update-sender-id.dto.js";
import { SenderIdMapper } from "../sender-id.mapper.js";
import { SenderIdService } from "../services/sender-id.service.js";

@ApiTags("Sender IDs")
@Controller("sender-ids")
export class SenderIdsController {
  constructor(
    private readonly senderIds: SenderIdService,
    private readonly mapper: SenderIdMapper,
  ) { }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  @Get()
  @Authorize(Permissions.SENDER_IDS_READ)
  @ApiOperation({
    summary: "Retrieve a paginated list of Sender IDs.",
  })
  @ApiPaginatedResponse(SenderIdResponseDto)
  async findMany(
    @Query() dto: FindSenderIdsDto,
  ): Promise<PaginatedResponse<SenderIdResponseDto>> {
    const page =
      await this.senderIds.findMany({
        page: dto.page ?? 1,
        pageSize: dto.pageSize ?? 20,
        clientId: dto.clientId,
        status: dto.status,
        sender: dto.sender,
        search: dto.search,
        isDefault: dto.isDefault,
      });

    return new PaginatedResponse(
      this.mapper.toResponses(page.items),
      page,
    );
  }

  @Get(":id")
  @Authorize(Permissions.SENDER_IDS_READ)
  @ApiOperation({
    summary: "Retrieve a Sender ID.",
  })
  @ApiParam({
    name: "id",
    description: "Sender ID identifier.",
  })
  @ApiSuccessResponse(SenderIdResponseDto)
  @ApiNotFoundResponse({
    description: "Sender ID not found.",
  })
  async findById(
    @Param("id", ParseUUIDPipe)
    id: string,
  ): Promise<SenderIdResponseDto> {
    return this.mapper.toResponse(
      await this.senderIds.findById(id),
    );
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  @Post()
  @Authorize(Permissions.SENDER_IDS_CREATE)
  @ApiOperation({
    summary: "Create a Sender ID.",
  })
  @ApiSuccessResponse(SenderIdResponseDto)
  async create(
    @Body() dto: CreateSenderIdDto,
  ): Promise<SenderIdResponseDto> {
    return this.mapper.toResponse(
      await this.senderIds.create(dto),
    );
  }

  @Put(":id")
  @Authorize(Permissions.SENDER_IDS_UPDATE)
  @ApiOperation({
    summary: "Update a Sender ID.",
  })
  @ApiParam({
    name: "id",
    description: "Sender ID identifier.",
  })
  @ApiSuccessResponse(SenderIdResponseDto)
  @ApiNotFoundResponse({
    description: "Sender ID not found.",
  })
  async update(
    @Param("id", ParseUUIDPipe)
    id: string,
    @Body() dto: UpdateSenderIdDto,
  ): Promise<SenderIdResponseDto> {
    return this.mapper.toResponse(
      await this.senderIds.update(
        id,
        dto,
      ),
    );
  }

  @Delete(":id")
  @Authorize(Permissions.SENDER_IDS_DELETE)
  @ApiOperation({
    summary: "Delete a Sender ID.",
  })
  @ApiParam({
    name: "id",
    description: "Sender ID identifier.",
  })
  async delete(
    @Param("id", ParseUUIDPipe)
    id: string,
  ): Promise<void> {
    await this.senderIds.delete(id);
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  @Post(":id/approve")
  @Authorize(Permissions.SENDER_IDS_APPROVE)
  @ApiOperation({
    summary: "Approve a Sender ID.",
  })
  @ApiParam({
    name: "id",
    description: "Sender ID identifier.",
  })
  @ApiSuccessResponse(SenderIdResponseDto)
  async approve(
    @Param("id", ParseUUIDPipe)
    id: string,
  ): Promise<SenderIdResponseDto> {
    return this.mapper.toResponse(
      await this.senderIds.approve(id),
    );
  }

  @Post(":id/reject")
  @Authorize(Permissions.SENDER_IDS_REJECT)
  @ApiOperation({
    summary: "Reject a Sender ID.",
  })
  @ApiParam({
    name: "id",
    description: "Sender ID identifier.",
  })
  @ApiSuccessResponse(SenderIdResponseDto)
  async reject(
    @Param("id", ParseUUIDPipe)
    id: string,
  ): Promise<SenderIdResponseDto> {
    return this.mapper.toResponse(
      await this.senderIds.reject(id),
    );
  }

  @Post(":id/disable")
  @Authorize(Permissions.SENDER_IDS_DISABLE)
  @ApiOperation({
    summary: "Disable a Sender ID.",
  })
  @ApiParam({
    name: "id",
    description: "Sender ID identifier.",
  })
  @ApiSuccessResponse(SenderIdResponseDto)
  async disable(
    @Param("id", ParseUUIDPipe)
    id: string,
  ): Promise<SenderIdResponseDto> {
    return this.mapper.toResponse(
      await this.senderIds.disable(id),
    );
  }

  @Post(":id/default")
  @Authorize(Permissions.SENDER_IDS_DEFAULT_UPDATE)
  @ApiOperation({
    summary: "Set a Sender ID as the client's default.",
  })
  @ApiParam({
    name: "id",
    description: "Sender ID identifier.",
  })
  @ApiSuccessResponse(SenderIdResponseDto)
  async setDefault(
    @Param("id", ParseUUIDPipe)
    id: string,
  ): Promise<SenderIdResponseDto> {
    return this.mapper.toResponse(
      await this.senderIds.setDefault(id),
    );
  }
}