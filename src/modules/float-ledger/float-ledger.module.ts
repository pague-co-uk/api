import { Module } from "@nestjs/common";

import { ClockService } from "../../common/services/clock.service.js";
import { RandomGenerator } from "../../common/services/random.service.js";
import { FloatLedgerRepository } from "../../repositories/FloatLedgerRepository.js";
import { ClientRepository } from "../../repositories/ClientRepository.js";
import { FloatLedgerController } from "./controllers/float-ledger.controller.js";
import { PlatformFloatLedgerController } from "./controllers/platform-float-ledger.controller.js";
import { FloatLedgerMapper } from "./float-ledger.mapper.js";
import { FloatLedgerService } from "./services/float-ledger.service.js";
import { FloatAlertService } from "./services/float-alert.service.js";
import { EmailModule } from "../email/email.module.js";

@Module({
  imports: [EmailModule],
  controllers: [
    FloatLedgerController, PlatformFloatLedgerController
  ],

  providers: [
    FloatLedgerRepository,
    ClientRepository,
    FloatLedgerService,
    FloatAlertService,
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
