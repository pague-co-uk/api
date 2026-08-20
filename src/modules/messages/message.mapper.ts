import { Injectable } from "@nestjs/common";

import type {
  Message,
  MessageStatusEvent,
} from "@prisma/client";

import {
  MessageStatusEventResponseDto,
} from "./dto/message-status-event.response.dto.js";
import { MessageResponseDto } from "./dto/message.response.dto.js";

@Injectable()
export class MessageMapper {
  toResponse(
    message: Message,
  ): MessageResponseDto {
    return {
      id: message.id,
      publicId: message.publicId,

      clientId: message.clientId,
      senderIdId: message.senderIdId,

      destination:
        message.destination,

      body:
        message.body,

      encoding:
        message.encoding,

      segmentCount:
        message.segmentCount,

      currentStatus:
        message.currentStatus,

      submittedAt:
        message.submittedAt,

      createdAt:
        message.createdAt,

      updatedAt:
        message.updatedAt,
    };
  }

  toResponses(
    messages: readonly Message[],
  ): MessageResponseDto[] {
    return messages.map(
      (message) =>
        this.toResponse(message),
    );
  }

  toStatusResponse(
    event: MessageStatusEvent,
  ): MessageStatusEventResponseDto {
    return {
      id: event.id,

      messageId:
        event.messageId,

      attemptId:
        event.attemptId,

      status:
        event.status,

      source:
        event.source,

      description:
        event.description,

      rawData:
        event.rawData,

      createdAt:
        event.createdAt,
    };
  }

  toStatusResponses(
    events: readonly MessageStatusEvent[],
  ): MessageStatusEventResponseDto[] {
    return events.map(
      (event) =>
        this.toStatusResponse(event),
    );
  }
}