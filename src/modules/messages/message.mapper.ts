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

export type MessageDetailsWithRelations =
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

      statusEvents: {
        orderBy: {
          createdAt: "asc";
        };
      };

      routeAttempts: {
        orderBy: {
          attemptNumber: "asc";
        };

        include: {
          route: {
            include: {
              mobileNetwork: {
                select: {
                  id: true;
                  name: true;
                };
              };
            };
          };

          connector: true;

          messageStatusEvents: {
            orderBy: {
              createdAt: "asc";
            };
          };
        };
      };
    };
  }>;

@Injectable()
export class MessageMapper {
  // =========================================================================
  // Message
  // =========================================================================

  toResponse(
    message: MessageWithRelations,
  ): MessageResponseDto {
    return {
      id:
        message.id,

      publicId:
        message.publicId,

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

      senderId:
        message.senderId
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

      statusEvents: [],

      routeAttempts: [],
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

  // =========================================================================
  // Message Details
  // =========================================================================

  toDetailsResponse(
    message: MessageDetailsWithRelations,
  ): MessageResponseDto {
    return {
      ...this.toResponse(message),

      statusEvents:
        message.statusEvents.map(
          (event) =>
            this.toStatusResponse(
              event,
            ),
        ),

      routeAttempts:
        message.routeAttempts.map(
          (attempt) => ({
            id:
              attempt.id,

            attemptNumber:
              attempt.attemptNumber,

            priority:
              attempt.priority,

            status:
              attempt.status,

            route: {
              id:
                attempt.route.id,

              publicId:
                attempt.route.publicId,

              mobileNetwork: {
                id:
                  attempt.route.mobileNetwork.id,

                name:
                  attempt.route.mobileNetwork.name,
              },

              connectorId:
                attempt.route.connectorId,

              status:
                attempt.route.status,
            },

            connector: {
              id:
                attempt.connector.id,

              publicId:
                attempt.connector.publicId,
            },

            providerMessageId:
              attempt.providerMessageId,

            errorCode:
              attempt.errorCode,

            errorMessage:
              attempt.errorMessage,

            dispatchedAt:
              attempt.dispatchedAt,

            startedAt:
              attempt.startedAt,

            submittedAt:
              attempt.submittedAt,

            failedAt:
              attempt.failedAt,

            completedAt:
              attempt.completedAt,

            createdAt:
              attempt.createdAt,

            updatedAt:
              attempt.updatedAt,

            statusEvents:
              attempt.messageStatusEvents.map(
                (event) =>
                  this.toStatusResponse(
                    event,
                  ),
              ),
          }),
        ),
    };
  }

  // =========================================================================
  // Status Events
  // =========================================================================

  toStatusResponse(
    event: MessageStatusEvent,
  ): MessageStatusEventResponseDto {
    return {
      id:
        event.id,

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