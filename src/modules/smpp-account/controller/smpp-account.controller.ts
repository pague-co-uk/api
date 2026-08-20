import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { ChangeSmppPasswordDto } from "../dto/change-smpp-password.dto.js";
import { CreateSmppAccountDto } from "../dto/create-smpp-account.dto.js";
import { SmppAccountResponseDto } from "../dto/smpp-response.dto.js";
import { UpdateSmppAccountDto } from "../dto/update-smpp-account.dto.js";
import { SmppAccountService } from "../services/smpp-account.service.js";
import { SmppAccountMapper } from "../smpp-account.mapper.js";

@ApiTags("SMPP Accounts")
@Controller("clients/:clientId/smpp-accounts")
export class SmppAccountController {
  constructor(
    private readonly accounts: SmppAccountService,
    private readonly mapper: SmppAccountMapper,
  ) { }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  @Get()
  @Authorize(Permissions.SMPP_ACCOUNTS_READ)
  @ApiOperation({
    summary: "Retrieve SMPP accounts for a client.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiSuccessResponse(SmppAccountResponseDto)
  async findByClient(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
  ): Promise<SmppAccountResponseDto[]> {
    return this.mapper.toResponses(
      await this.accounts.findByClient(
        clientId,
      ),
    );
  }

  @Get(":id")
  @Authorize(Permissions.SMPP_ACCOUNTS_READ)
  @ApiOperation({
    summary: "Retrieve an SMPP account.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description: "SMPP account identifier.",
  })
  @ApiSuccessResponse(SmppAccountResponseDto)
  @ApiNotFoundResponse({
    description: "SMPP account not found.",
  })
  async findById(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Param("id", ParseUUIDPipe)
    id: string,
  ): Promise<SmppAccountResponseDto> {
    return this.mapper.toResponse(
      await this.accounts.findById(
        clientId,
        id,
      ),
    );
  }

  @Get("public/:publicId")
  @Authorize(Permissions.SMPP_ACCOUNTS_READ)
  @ApiOperation({
    summary: "Retrieve an SMPP account by public identifier.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiParam({
    name: "publicId",
    description: "Public SMPP account identifier.",
  })
  @ApiSuccessResponse(SmppAccountResponseDto)
  @ApiNotFoundResponse({
    description: "SMPP account not found.",
  })
  async findByPublicId(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Param("publicId")
    publicId: string,
  ): Promise<SmppAccountResponseDto> {
    return this.mapper.toResponse(
      await this.accounts.findByPublicId(
        clientId,
        publicId,
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  @Post()
  @Authorize(Permissions.SMPP_ACCOUNTS_CREATE)
  @ApiOperation({
    summary: "Create an SMPP account.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiBody({
    type: CreateSmppAccountDto,
  })
  @ApiSuccessResponse(SmppAccountResponseDto)
  async create(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Body() dto: CreateSmppAccountDto,
  ): Promise<SmppAccountResponseDto> {
    return this.mapper.toResponse(
      await this.accounts.create(
        clientId,
        dto,
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  @Patch(":id")
  @Authorize(Permissions.SMPP_ACCOUNTS_UPDATE)
  @ApiOperation({
    summary: "Update SMPP account configuration.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description: "SMPP account identifier.",
  })
  @ApiBody({
    type: UpdateSmppAccountDto,
  })
  @ApiSuccessResponse(SmppAccountResponseDto)
  @ApiNotFoundResponse({
    description: "SMPP account not found.",
  })
  async update(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Param("id", ParseUUIDPipe)
    id: string,
    @Body() dto: UpdateSmppAccountDto,
  ): Promise<SmppAccountResponseDto> {
    return this.mapper.toResponse(
      await this.accounts.update(
        clientId,
        id,
        dto,
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Password
  // -------------------------------------------------------------------------

  @Post(":id/password")
  @Authorize(Permissions.SMPP_ACCOUNTS_PASSWORD_UPDATE)
  @ApiOperation({
    summary: "Change the SMPP account password.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description: "SMPP account identifier.",
  })
  @ApiBody({
    type: ChangeSmppPasswordDto,
  })
  @ApiSuccessResponse(SmppAccountResponseDto)
  @ApiNotFoundResponse({
    description: "SMPP account not found.",
  })
  async changePassword(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Param("id", ParseUUIDPipe)
    id: string,
    @Body() dto: ChangeSmppPasswordDto,
  ): Promise<SmppAccountResponseDto> {
    return this.mapper.toResponse(
      await this.accounts.changePassword(
        clientId,
        id,
        dto.password,
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  @Post(":id/activate")
  @Authorize(Permissions.SMPP_ACCOUNTS_ACTIVATE)
  @ApiOperation({
    summary: "Activate an SMPP account.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description: "SMPP account identifier.",
  })
  @ApiSuccessResponse(SmppAccountResponseDto)
  @ApiNotFoundResponse({
    description: "SMPP account not found.",
  })
  async activate(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Param("id", ParseUUIDPipe)
    id: string,
  ): Promise<SmppAccountResponseDto> {
    return this.mapper.toResponse(
      await this.accounts.activate(
        clientId,
        id,
      ),
    );
  }

  @Post(":id/disable")
  @Authorize(Permissions.SMPP_ACCOUNTS_DISABLE)
  @ApiOperation({
    summary: "Disable an SMPP account.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description: "SMPP account identifier.",
  })
  @ApiSuccessResponse(SmppAccountResponseDto)
  @ApiNotFoundResponse({
    description: "SMPP account not found.",
  })
  async disable(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Param("id", ParseUUIDPipe)
    id: string,
  ): Promise<SmppAccountResponseDto> {
    return this.mapper.toResponse(
      await this.accounts.disable(
        clientId,
        id,
      ),
    );
  }
}