import {
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";

import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import {
  Authorize,
} from "../../../common/authorization/decorators/authorize.decorator.js";

import {
  CurrentUser,
} from "../../../common/authorization/decorators/current-user.decorator.js";

import type {
  AuthenticatedUser,
} from "../../../common/authorization/interfaces/authenticated-user.interface.js";

import {
  Permissions,
} from "../../../common/authorization/permissions/permissions.registry.js";

import {
  FindTransactionsDto,
} from "../dto/find-transactions.dto.js";

import {
  TransactionResponseDto,
} from "../dto/transaction-response.dto.js";

import {
  TransactionListResponse,
  TransactionsService,
} from "../services/transactions.service.js";

@ApiTags("Transactions")
@Controller("transactions")
export class TransactionsController {
  constructor(
    private readonly transactionsService:
      TransactionsService,
  ) { }

  @Get()
  @Authorize(
    Permissions.PAYMENTS_READ,
  )
  @ApiOperation({
    summary:
      "List payment transactions.",
  })
  async findMany(
    @CurrentUser()
    user: AuthenticatedUser,

    @Query()
    dto: FindTransactionsDto,
  ): Promise<TransactionListResponse> {
    return this.transactionsService.findMany(
      user,
      dto,
    );
  }

  @Get(":id")
  @Authorize(
    Permissions.PAYMENTS_READ,
  )
  @ApiOperation({
    summary:
      "Retrieve a payment transaction.",
  })
  async findById(
    @CurrentUser()
    user: AuthenticatedUser,

    @Param("id")
    id: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.findById(
      user,
      id,
    );
  }
}