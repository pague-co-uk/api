import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";

import { CreateTransactionTypeDto } from "../dto/create-transaction-type.dto.js";
import { FindTransactionTypesDto } from "../dto/find-transaction-types.dto.js";
import { UpdateTransactionTypeDto } from "../dto/update-transaction-type.dto.js";
import { TransactionTypesService } from "../services/transaction-type.service.js";

@Controller("transaction-types")
export class TransactionTypesController {
  constructor(
    private readonly transactionTypesService: TransactionTypesService,
  ) { }

  @Post()
  @Authorize(
    Permissions.TRANSACTION_TYPES_CREATE,
  )
  async create(
    @Body() dto: CreateTransactionTypeDto,
  ) {
    return this.transactionTypesService.create(
      dto,
    );
  }

  @Get()
  @Authorize(
    Permissions.TRANSACTION_TYPES_READ,
  )
  async findMany(
    @Query() dto: FindTransactionTypesDto,
  ) {
    return this.transactionTypesService.findMany(
      dto,
    );
  }

  @Get(":id")
  @Authorize(
    Permissions.TRANSACTION_TYPES_READ,
  )
  async findById(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.transactionTypesService.findById(
      id,
    );
  }

  @Patch(":id")
  @Authorize(
    Permissions.TRANSACTION_TYPES_UPDATE,
  )
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionTypeDto,
  ) {
    return this.transactionTypesService.update(
      id,
      dto,
    );
  }

  @Patch(":id/enable")
  @Authorize(
    Permissions.TRANSACTION_TYPES_ENABLE,
  )
  async enable(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.transactionTypesService.enable(
      id,
    );
  }

  @Patch(":id/disable")
  @Authorize(
    Permissions.TRANSACTION_TYPES_DISABLE,
  )
  async disable(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.transactionTypesService.disable(
      id,
    );
  }
}