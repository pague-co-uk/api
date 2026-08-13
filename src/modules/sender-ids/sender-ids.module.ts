import { Module } from "@nestjs/common";

import { SenderIdRepository } from "../../repositories/SenderIdRepository.js";

import { SenderIdsController } from "./controllers/sender-ids.controller.js";
import { SenderIdMapper } from "./sender-id.mapper.js";
import { SenderIdService } from "./services/sender-id.service.js";

@Module({
  controllers: [
    SenderIdsController,
  ],

  providers: [
    SenderIdRepository,
    SenderIdService,
    SenderIdMapper,
  ],

  exports: [
    SenderIdService,
  ],
})
export class SenderIdsModule { }