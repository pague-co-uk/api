import { Module } from "@nestjs/common";

import { SenderIdRepository } from "../../repositories/SenderIdRepository.js";

import { ClientsModule } from "../clients/clients.module.js";
import { ClientSenderIdsController } from "./controllers/client-sender-ids.controller.js";
import { SenderIdsController } from "./controllers/sender-ids.controller.js";
import { SenderIdMapper } from "./sender-id.mapper.js";
import { SenderIdService } from "./services/sender-id.service.js";

@Module({
  controllers: [
    SenderIdsController,
    ClientSenderIdsController,
  ],

  providers: [
    SenderIdRepository,
    SenderIdService,
    SenderIdMapper,
  ],
  imports: [ClientsModule],
  exports: [
    SenderIdService,
  ],
})
export class SenderIdsModule { }