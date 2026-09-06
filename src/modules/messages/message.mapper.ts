import { Injectable } from "@nestjs/common";

import type {
  MessageStatusEvent,
  Prisma,
} from "@prisma/client";

import {
  MessageStatusEventResponseDto,
} from "./dto/message-status-event.response.dto.js";

import {
  MessageResponseDto,
} from "./dto/message.response.dto.js";

export type MessageWithRelations =
  Prisma.MessageGetPayload<{
    include: {
      client: {
        select: {
          id: true;
          publicId: true;
          companyName: true;
          displayName: true;
        };
      };
      senderId: {
        select: {
          id: true;
          publicId: true;
          sender: true;
        };
      };
    };
  }>;

@Injectable()
export class MessageMapper {
  toResponse(
    message: MessageWithRelations,
  ): MessageResponseDto {
    return {
      id: message.id,
      publicId: message.publicId,

      clientId:
        message.clientId,

      senderIdId:
        message.senderIdId,

      client: {
        id:
          message.client.id,

        publicId:
          message.client.publicId,

        companyName:
          message.client.companyName,

        displayName:
          message.client.displayName,
      },

      senderId: message.senderId
        ? {
          id:
            message.senderId.id,

          publicId:
            message.senderId.publicId,

          sender:
            message.senderId.sender,
        }
        : null,

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
        message.submittedAt!,

      createdAt:
        message.createdAt,

      updatedAt:
        message.updatedAt,
    };
  }

  toResponses(
    messages: readonly MessageWithRelations[],
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
        this.toStatusResponse(
          event,
        ),
    );
  }
}