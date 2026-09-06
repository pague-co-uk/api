import { Module } from "@nestjs/common";
import { RandomGenerator } from "../../common/services/random.service.js";
import { SecretHasher } from "../../common/services/secretHasher.service.js";
import { SmppAccountRepository } from "../../repositories/smppAccountRepository.js";
import { PlatformSmppAccountController } from "./controller/platform-smpp-account.controller.js";
import { SmppAccountController } from "./controller/smpp-account.controller.js";
import { SmppAccountService } from "./services/smpp-account.service.js";
import { SmppAccountMapper } from "./smpp-account.mapper.js";


@Module({
  imports: [],
  controllers: [SmppAccountController, PlatformSmppAccountController],
  providers: [
    SmppAccountService,
    SmppAccountMapper,
    RandomGenerator,
    SecretHasher,
    SmppAccountRepository
  ],
  exports: [],
})
export class SmppAccountsModule { }
