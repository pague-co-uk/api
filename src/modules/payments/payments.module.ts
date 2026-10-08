import { Module } from "@nestjs/common";

import { AuthorizationModule } from "../../common/authorization/authorization.module.js";
import { PaymentsController } from "./controllers/payments.controller.js";
import { PaymentsRepository } from "./repositories/payments.repository.js";
import { PaymentsService } from "./services/payments.service.js";
import { RandomGenerator } from "../../common/services/random.service.js";

@Module({
  controllers: [
    PaymentsController,
  ],
  providers: [
    PaymentsRepository,
    PaymentsService,
    RandomGenerator
  ],
  imports: [AuthorizationModule],
  exports: [
    PaymentsService,
  ],
})
export class PaymentsModule { }