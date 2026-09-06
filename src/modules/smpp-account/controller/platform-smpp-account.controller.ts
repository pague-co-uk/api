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
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import { PaginatedResponse } from "../../../common/interfaces/paginated.response.js";
import { ApiPaginatedResponse } from "../../../decorators/api-paginated-response.decorator.js";

import { FindSmppAccountsDto } from "../dto/find-smpp-accounts.dto.js";
import { SmppAccountResponseDto } from "../dto/smpp-response.dto.js";
import { SmppAccountService } from "../services/smpp-account.service.js";
import { SmppAccountMapper } from "../smpp-account.mapper.js";

@ApiTags("SMPP Accounts")
@Controller("smpp-accounts")
export class PlatformSmppAccountController {
  constructor(
    private readonly accounts: SmppAccountService,
    private readonly mapper: SmppAccountMapper,
  ) { }

  @Get()
  @Authorize(
    Permissions.SMPP_ACCOUNTS_READ,
  )
  @ApiOperation({
    summary:
      "Retrieve SMPP accounts across clients.",
  })
  @ApiPaginatedResponse(
    SmppAccountResponseDto,
  )
  async findMany(
    @Query()
    dto: FindSmppAccountsDto,
  ): Promise<
    PaginatedResponse<SmppAccountResponseDto>
  > {
    const page =
      await this.accounts.listPlatform({
        page:
          dto.page ?? 1,

        pageSize:
          dto.pageSize ?? 20,

        clientId:
          dto.clientId,

        status:
          dto.status,

        search:
          dto.search,
      });

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }
}