import { Module } from "@nestjs/common";

import { TransactionsController } from "./controllers/transactions.controller.js";
import { TransactionsRepository } from "./repositories/transactions.repository.js";
import { TransactionsService } from "./services/transactions.service.js";

@Module({
  controllers: [TransactionsController],
  providers: [
    TransactionsRepository,
    TransactionsService,
  ],
  exports: [
    TransactionsRepository,
    TransactionsService,
  ],
})
export class TransactionsModule { }