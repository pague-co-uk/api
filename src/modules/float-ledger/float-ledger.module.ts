import { Module } from "@nestjs/common";

import { ClockService } from "../../common/services/clock.service.js";
import { RandomGenerator } from "../../common/services/random.service.js";
import { FloatLedgerRepository } from "../../repositories/FloatLedgerRepository.js";
import { FloatLedgerController } from "./controllers/float-ledger.controller.js";
import { FloatLedgerMapper } from "./float-ledger.mapper.js";
import { FloatLedgerService } from "./services/float-ledger.service.js";

@Module({
  controllers: [
    FloatLedgerController,
  ],

  providers: [
    FloatLedgerRepository,
    FloatLedgerService,
    FloatLedgerMapper,
    RandomGenerator,
    ClockService
  ],

  exports: [
    FloatLedgerRepository,
    FloatLedgerService,
    FloatLedgerMapper,
  ],
})
export class FloatLedgerModule { }