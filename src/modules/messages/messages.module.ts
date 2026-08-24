import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module.js";
import { MessageRepository } from "../../repositories/messageRepository.js";
import { MessageStatusEventRepository } from "../../repositories/messageStatusEventRepository.js";

import { ClockService } from "../../common/services/clock.service.js";
import { RandomGenerator } from "../../common/services/random.service.js";
import { OutboxEventRepository } from "../../repositories/OutboxRepository.js";
import { FloatLedgerModule } from "../float-ledger/float-ledger.module.js";
import { MessagesController } from "./controllers/messages.controller.js";
import { MessageMapper } from "./message.mapper.js";
import { MessageService } from "./services/message.service.js";

@Module({
  imports: [
    DatabaseModule,
    FloatLedgerModule,
  ],

  controllers: [
    MessagesController,
  ],

  providers: [
    MessageRepository,
    MessageStatusEventRepository,
    MessageService,
    MessageMapper,
    RandomGenerator,
    ClockService,
    OutboxEventRepository
  ],

  exports: [
    MessageService,
  ],
})
export class MessagesModule { }