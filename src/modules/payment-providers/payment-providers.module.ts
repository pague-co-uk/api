import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module.js";
import { PaymentProvidersController } from "./controllers/payment-providers.controller.js";
import { PaymentProvidersRepository } from "./repositories/payment-providers.repository.js";
import { PaymentProvidersService } from "./services/payment-providers.service.js";

@Module({
  controllers: [
    PaymentProvidersController,
  ],
  imports: [DatabaseModule],

  providers: [
    PaymentProvidersRepository,
    PaymentProvidersService,
  ],

  exports: [
    PaymentProvidersService,
  ],
})
export class PaymentProvidersModule { }