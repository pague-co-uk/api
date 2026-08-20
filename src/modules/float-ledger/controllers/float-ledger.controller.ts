import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import type { AuthenticatedRequest } from "../../../common/authorization/interfaces/index.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";

import { AdjustFloatDto } from "../dto/adjust-float.dto.js";
import { DebitFloatDto } from "../dto/debit-float.dto.js";
import { FindFloatLedgerDto } from "../dto/find-float-ledger.dto.js";
import { RefundFloatDto } from "../dto/refund-float.dto.js";
import { TopUpFloatDto } from "../dto/top-up-float.dto.js";
import { FloatLedgerMapper } from "../float-ledger.mapper.js";
import { FloatLedgerService } from "../services/float-ledger.service.js";

@ApiTags("Float Ledger")
@Controller("clients/:clientId/float")
export class FloatLedgerController {
  constructor(
    private readonly ledger: FloatLedgerService,
    private readonly mapper: FloatLedgerMapper,
  ) { }

  // -------------------------------------------------------------------------
  // Ledger operations
  // -------------------------------------------------------------------------

  @Post("top-up")
  @Authorize(Permissions.FLOAT_TOP_UP)
  @ApiOperation({
    summary: "Top up a client's float balance.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiBody({
    type: TopUpFloatDto,
  })
  async topUp(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Body() dto: TopUpFloatDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.mapper.toResponse(
      await this.ledger.topUp(
        clientId,
        dto.credits,
        request.user!.userId,
        dto.referenceId,
        dto.description,
      ),
    );
  }

  @Post("debit")
  @Authorize(Permissions.FLOAT_DEBIT)
  @ApiOperation({
    summary: "Debit credits from a client's float balance.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiBody({
    type: DebitFloatDto,
  })
  async debit(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Body() dto: DebitFloatDto,
  ) {
    return this.mapper.toResponse(
      await this.ledger.debit(
        clientId,
        dto.credits,
        dto.referenceType,
        dto.referenceId,
        dto.description,
      ),
    );
  }

  @Post("refund")
  @Authorize(Permissions.FLOAT_REFUND)
  @ApiOperation({
    summary: "Refund credits to a client's float balance.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiBody({
    type: RefundFloatDto,
  })
  async refund(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Body() dto: RefundFloatDto,
  ) {
    return this.mapper.toResponse(
      await this.ledger.refund(
        clientId,
        dto.credits,
        dto.referenceType,
        dto.referenceId,
        dto.description,
      ),
    );
  }

  @Post("adjust")
  @Authorize(Permissions.FLOAT_ADJUST)
  @ApiOperation({
    summary: "Adjust a client's float balance.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiBody({
    type: AdjustFloatDto,
  })
  async adjust(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Body() dto: AdjustFloatDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.mapper.toResponse(
      await this.ledger.adjust(
        clientId,
        dto.credits,
        request.user!.userId,
        dto.description,
        dto.referenceId,
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Balance
  // -------------------------------------------------------------------------

  @Get("balance")
  @Authorize(Permissions.FLOAT_READ)
  @ApiOperation({
    summary: "Retrieve a client's current float balance.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  async getBalance(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
  ): Promise<number> {
    return this.ledger.getBalance(
      clientId,
    );
  }

  // -------------------------------------------------------------------------
  // Ledger queries
  // -------------------------------------------------------------------------

  @Get("ledger")
  @Authorize(Permissions.FLOAT_READ)
  @ApiOperation({
    summary: "Retrieve a client's float ledger.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  async list(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Query() dto: FindFloatLedgerDto,
  ) {
    const entries =
      await this.ledger.list(
        clientId,
        {
          limit: dto.limit,
          offset: dto.offset,
        },
      );

    return this.mapper.toResponses(
      entries,
    );
  }

  @Get("ledger/:id")
  @Authorize(Permissions.FLOAT_READ)
  @ApiOperation({
    summary: "Retrieve a float ledger entry.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiParam({
    name: "id",
    description: "Ledger entry identifier.",
  })
  @ApiNotFoundResponse({
    description: "Float ledger entry not found.",
  })
  async findById(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Param("id", ParseUUIDPipe)
    id: string,
  ) {
    const entry =
      await this.ledger.findById(
        clientId,
        id,
      );

    return entry
      ? this.mapper.toResponse(entry)
      : null;
  }

  @Get("ledger/public/:publicId")
  @Authorize(Permissions.FLOAT_READ)
  @ApiOperation({
    summary: "Retrieve a float ledger entry by public ID.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiParam({
    name: "publicId",
    description: "Public ledger entry identifier.",
  })
  @ApiNotFoundResponse({
    description: "Float ledger entry not found.",
  })
  async findByPublicId(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,
    @Param("publicId") publicId: string,
  ) {
    const entry =
      await this.ledger.findByPublicId(
        clientId,
        publicId,
      );

    return entry
      ? this.mapper.toResponse(entry)
      : null;
  }
}