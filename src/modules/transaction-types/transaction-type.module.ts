import { Module } from "@nestjs/common";
import { TransactionTypesController } from "./controllers/transaction-type.controller.js";
import { TransactionTypesRepository } from "./repositories/transaction-type.repository.js";
import { TransactionTypesService } from "./services/transaction-type.service.js";

@Module({
  controllers: [
    TransactionTypesController,
  ],

  providers: [
    TransactionTypesRepository,
    TransactionTypesService,
  ],

  exports: [
    TransactionTypesService,
  ],
})
export class TransactionTypesModule { }