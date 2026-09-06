import {
  Controller,
  Get,
  Query,
} from "@nestjs/common";

import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";

import {
  Permissions,
} from "../../../common/authorization/permissions/permissions.registry.js";

import {
  PaginatedResponse,
} from "../../../common/interfaces/paginated.response.js";


import {
  FindPlatformFloatLedgerDto,
} from "../dto/find-platform-float-ledger.dto.js";

import {
  FloatLedgerMapper,
} from "../float-ledger.mapper.js";

import {
  FloatLedgerService,
} from "../services/float-ledger.service.js";

@ApiTags("Float Ledger")
@Controller("float")
export class PlatformFloatLedgerController {
  constructor(
    private readonly ledger: FloatLedgerService,
    private readonly mapper: FloatLedgerMapper,
  ) { }

  @Get()
  @Authorize(Permissions.FLOAT_READ)
  @ApiOperation({
    summary:
      "Retrieve float ledger entries across clients.",
  })
  async list(
    @Query()
    dto: FindPlatformFloatLedgerDto,
  ) {
    const result =
      await this.ledger.listPlatform({
        page:
          dto.page ?? 1,

        pageSize:
          dto.pageSize ?? 20,

        clientId:
          dto.clientId,

        transactionType:
          dto.transactionType,

        referenceType:
          dto.referenceType,

        search:
          dto.search,
      });

    return new PaginatedResponse(
      this.mapper.toResponses(
        result.items,
      ),
      result,
    );
  }
}