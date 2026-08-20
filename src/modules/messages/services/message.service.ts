import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  LedgerReferenceType,
  MessageEncoding,
  MessageStatus,
} from "@prisma/client";

import {
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { ClockService } from "../../../common/services/clock.service.js";
import { RandomGenerator } from "../../../common/services/random.service.js";
import { FloatLedgerService } from "../../float-ledger/services/float-ledger.service.js";

import { MessageRepository } from "../../../repositories/messageRepository.js";
import { MessageStatusEventRepository } from "../../../repositories/messageStatusEventRepository.js";
import { OutboxEventRepository } from "../../../repositories/OutboxRepository.js";

import type { CreateMessageDto } from "../dto/create-message.dto.js";

@Injectable()
export class MessageService {
  private readonly logger =
    getComponentLogger("MessageService");

  // -------------------------------------------------------------------------
  // Message queues
  // -------------------------------------------------------------------------

  private static readonly QUEUE_BY_STATUS:
    Readonly<
      Record<MessageStatus, string>
    > = {
      [MessageStatus.QUEUED]:
        "sms.queued",

      [MessageStatus.ROUTED]:
        "sms.routed",

      [MessageStatus.SUBMITTED]:
        "sms.submitted",

      [MessageStatus.DELIVERED]:
        "sms.delivered",

      [MessageStatus.FAILED]:
        "sms.failed",

      [MessageStatus.EXPIRED]:
        "sms.expired",
    };
  // -------------------------------------------------------------------------
  // Terminal states
  // -------------------------------------------------------------------------

  /**
   * Terminal states cannot transition
   * to another message state.
   */
  private static readonly TERMINAL_STATUSES =
    new Set<MessageStatus>([
      MessageStatus.DELIVERED,
      MessageStatus.FAILED,
      MessageStatus.EXPIRED,
    ]);

  // -------------------------------------------------------------------------
  // Allowed transitions
  // -------------------------------------------------------------------------

  /**
   * Message lifecycle:
   *
   * QUEUED
   *   -> ROUTED
   *
   * ROUTED
   *   -> SUBMITTED
   *   -> FAILED
   *
   * SUBMITTED
   *   -> DELIVERED
   *   -> FAILED
   *   -> EXPIRED
   */
  private static readonly ALLOWED_TRANSITIONS:
    Readonly<
      Record<
        MessageStatus,
        readonly MessageStatus[]
      >
    > = {
      [MessageStatus.QUEUED]: [
        MessageStatus.ROUTED,
      ],

      [MessageStatus.ROUTED]: [
        MessageStatus.SUBMITTED,
        MessageStatus.FAILED,
      ],

      [MessageStatus.SUBMITTED]: [
        MessageStatus.DELIVERED,
        MessageStatus.FAILED,
        MessageStatus.EXPIRED,
      ],

      [MessageStatus.DELIVERED]: [],

      [MessageStatus.FAILED]: [],

      [MessageStatus.EXPIRED]: [],
    };

  // -------------------------------------------------------------------------
  // GSM-7
  // -------------------------------------------------------------------------

  /**
   * GSM-7 extension characters.
   *
   * Each character consumes two septets.
   */
  private static readonly GSM7_EXTENDED_CHARS =
    new Set([
      "€",
      "[",
      "]",
      "{",
      "}",
      "^",
      "~",
      "\\",
      "|",
    ]);

  constructor(
    private readonly messages: MessageRepository,

    private readonly statusEvents:
      MessageStatusEventRepository,

    private readonly outbox:
      OutboxEventRepository,

    private readonly float:
      FloatLedgerService,

    private readonly random:
      RandomGenerator,

    private readonly clock:
      ClockService,
  ) { }

  // =========================================================================
  // Create
  // =========================================================================

  async create(
    clientId: string,
    dto: CreateMessageDto,
  ) {
    return withSpan(
      "MessageService.create",
      async (span) => {
        const publicId =
          this.generatePublicId();

        const segmentCount =
          this.calculateSegmentCount(
            dto.body,
            dto.encoding,
          );

        span.setAttributes({
          "client.id":
            clientId,

          "message.public_id":
            publicId,

          "message.encoding":
            dto.encoding,

          "message.segment_count":
            segmentCount,

          "message.status":
            MessageStatus.QUEUED,

          "message.queue":
            this.queueForStatus(
              MessageStatus.QUEUED,
            ),
        });

        try {
          /*
           * Everything that establishes the accepted
           * message must happen in one transaction:
           *
           *   1. Create message
           *   2. Debit float
           *   3. Create status event
           *   4. Create outbox event
           *
           * RabbitMQ is deliberately NOT touched here.
           */
          const message =
            await this.messages.withTransaction(
              async (tx) => {
                const messages =
                  this.messages.withDatabase(
                    tx,
                  );

                const statusEvents =
                  this.statusEvents.withDatabase(
                    tx,
                  );

                const outbox =
                  this.outbox.withDatabase(
                    tx,
                  );

                const float =
                  this.float.withDatabase(
                    tx,
                  );

                // -----------------------------------------------------------
                // Create message
                // -----------------------------------------------------------

                const message =
                  await messages.create({
                    publicId,

                    client: {
                      connect: {
                        id: clientId,
                      },
                    },

                    ...(dto.senderIdId
                      ? {
                        senderId: {
                          connect: {
                            id:
                              dto.senderIdId,
                          },
                        },
                      }
                      : {}),

                    destination:
                      dto.destination,

                    body:
                      dto.body,

                    encoding:
                      dto.encoding,

                    segmentCount,

                    currentStatus:
                      MessageStatus.QUEUED,

                    submittedAt:
                      this.clock.now(),
                  });

                // -----------------------------------------------------------
                // Debit float
                // -----------------------------------------------------------

                /*
                 * The message ID is the ledger reference.
                 *
                 * FloatLedgerService handles ledger
                 * idempotency for this reference.
                 */
                await float.debit(
                  clientId,

                  segmentCount,

                  LedgerReferenceType.MESSAGE,

                  message.id,

                  `Message submission: ${message.publicId}`,
                );

                // -----------------------------------------------------------
                // Status history
                // -----------------------------------------------------------

                await statusEvents.create({
                  message: {
                    connect: {
                      id: message.id,
                    },
                  },

                  status:
                    MessageStatus.QUEUED,

                  source:
                    "CONTROL_PLANE",

                  description:
                    "Message accepted and queued.",
                });

                // -----------------------------------------------------------
                // Outbox
                // -----------------------------------------------------------

                await outbox.create({
                  eventType:
                    "MESSAGE_STATUS",

                  aggregateType:
                    "MESSAGE",

                  aggregateId:
                    message.id,

                  queueName:
                    this.queueForStatus(
                      MessageStatus.QUEUED,
                    ),

                  payload: {
                    eventId:
                      this.generateEventId(),

                    occurredAt:
                      this.clock
                        .now()
                        .toISOString(),

                    version: 1,

                    messageId:
                      message.id,

                    publicId:
                      message.publicId,

                    clientId:
                      message.clientId,

                    destination:
                      message.destination,

                    body:
                      message.body,

                    encoding:
                      message.encoding,

                    segmentCount:
                      message.segmentCount,

                    status:
                      MessageStatus.QUEUED,
                  },

                  availableAt:
                    this.clock.now(),
                });

                return message;
              },
            );

          this.logger.info(
            {
              messageId:
                message.id,

              publicId:
                message.publicId,

              clientId,

              status:
                message.currentStatus,

              queue:
                this.queueForStatus(
                  MessageStatus.QUEUED,
                ),
            },
            "Message accepted.",
          );

          return message;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              publicId,
            },
            "Failed to create message.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Queries
  // =========================================================================

  async findByClient(
    clientId: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
      readonly status?: MessageStatus;
    },
  ) {
    return this.messages.findByClient(
      clientId,
      options,
    );
  }

  async findById(
    clientId: string,
    id: string,
  ) {
    const message =
      await this.messages.findById(
        id,
      );

    return this.ensureClientOwnership(
      message,
      clientId,
    );
  }

  async findByPublicId(
    clientId: string,
    publicId: string,
  ) {
    const message =
      await this.messages.findByPublicId(
        publicId,
      );

    return this.ensureClientOwnership(
      message,
      clientId,
    );
  }

  async countByClient(
    clientId: string,
    status?: MessageStatus,
  ) {
    return this.messages.countByClient(
      clientId,
      status,
    );
  }

  // =========================================================================
  // Status
  // =========================================================================

  async updateStatus(
    clientId: string,
    id: string,
    status: MessageStatus,
    source: string,
    description?: string,
    rawData?: unknown,
  ) {
    return withSpan(
      "MessageService.updateStatus",
      async (span) => {
        span.setAttributes({
          "client.id":
            clientId,

          "message.id":
            id,

          "message.target_status":
            status,

          "message.status_source":
            source,
        });

        try {
          /*
           * First establish that the message exists
           * and belongs to the client.
           */
          const message =
            await this.findById(
              clientId,
              id,
            );

          // ---------------------------------------------------------------
          // Terminal state
          // ---------------------------------------------------------------

          /*
           * A terminal message can NEVER be mutated.
           *
           * This is important for duplicate callbacks,
           * late DLRs and competing consumers.
           */
          if (
            MessageService
              .TERMINAL_STATUSES
              .has(
                message.currentStatus,
              )
          ) {
            return message;
          }

          // ---------------------------------------------------------------
          // Same transient state
          // ---------------------------------------------------------------

          /*
           * Receiving the same transient status twice
           * is idempotent.
           */
          if (
            message.currentStatus ===
            status
          ) {
            return message;
          }

          // ---------------------------------------------------------------
          // Validate transition
          // ---------------------------------------------------------------

          this.assertValidTransition(
            message.currentStatus,
            status,
          );

          /*
           * Re-read and mutate inside one transaction.
           *
           * This protects against two consumers processing
           * the same message concurrently.
           */
          return this.messages.withTransaction(
            async (tx) => {
              const messages =
                this.messages.withDatabase(
                  tx,
                );

              const statusEvents =
                this.statusEvents.withDatabase(
                  tx,
                );

              const outbox =
                this.outbox.withDatabase(
                  tx,
                );

              const float =
                this.float.withDatabase(
                  tx,
                );

              // -----------------------------------------------------------
              // Re-read
              // -----------------------------------------------------------

              const current =
                await messages.findById(
                  id,
                );

              if (!current) {
                throw new NotFoundException(
                  "Message not found.",
                );
              }

              // -----------------------------------------------------------
              // Terminal protection
              // -----------------------------------------------------------

              if (
                MessageService
                  .TERMINAL_STATUSES
                  .has(
                    current.currentStatus,
                  )
              ) {
                return current;
              }

              // -----------------------------------------------------------
              // Duplicate transient state
              // -----------------------------------------------------------

              if (
                current.currentStatus ===
                status
              ) {
                return current;
              }

              // -----------------------------------------------------------
              // Validate against current state
              // -----------------------------------------------------------

              this.assertValidTransition(
                current.currentStatus,
                status,
              );

              // -----------------------------------------------------------
              // Update status
              // -----------------------------------------------------------

              const updated =
                await messages.updateStatus(
                  current.id,
                  status,
                );

              // -----------------------------------------------------------
              // Status event
              // -----------------------------------------------------------

              await statusEvents.create({
                message: {
                  connect: {
                    id:
                      current.id,
                  },
                },

                status,

                source,

                ...(description !==
                  undefined
                  ? {
                    description,
                  }
                  : {}),

                ...(rawData !==
                  undefined
                  ? {
                    rawData:
                      rawData as object,
                  }
                  : {}),
              });

              // -----------------------------------------------------------
              // Refund failed / expired messages
              // -----------------------------------------------------------

              /*
               * The debit was made when the message was
               * accepted.
               *
               * If delivery ultimately fails or expires,
               * reverse that debit.
               *
               * FloatLedgerService makes this operation
               * idempotent using the message reference.
               */
              if (
                status ===
                MessageStatus.FAILED ||
                status ===
                MessageStatus.EXPIRED
              ) {
                await float.refund(
                  clientId,

                  current.segmentCount,

                  LedgerReferenceType.MESSAGE,

                  current.id,

                  `Message ${status.toLowerCase()} refund: ${current.publicId}`,
                );
              }

              // -----------------------------------------------------------
              // Outbox
              // -----------------------------------------------------------

              /*
               * Only statuses that have downstream processing
               * receive a queue event.
               *
               * DELIVERED, FAILED and EXPIRED are terminal,
               * so they do not need another message-processing
               * queue.
               */
              const queueName =
                this.queueForStatus(
                  status,
                );

              if (queueName) {
                await outbox.create({
                  eventType:
                    "MESSAGE_STATUS",

                  aggregateType:
                    "MESSAGE",

                  aggregateId:
                    current.id,

                  queueName,

                  payload: {
                    eventId:
                      this.generateEventId(),

                    occurredAt:
                      this.clock
                        .now()
                        .toISOString(),

                    version: 1,

                    messageId:
                      current.id,

                    publicId:
                      current.publicId,

                    clientId:
                      current.clientId,

                    destination:
                      current.destination,

                    body:
                      current.body,

                    encoding:
                      current.encoding,

                    segmentCount:
                      current.segmentCount,

                    previousStatus:
                      current.currentStatus,

                    status,
                  },

                  availableAt:
                    this.clock.now(),
                });
              }

              return updated;
            },
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              messageId:
                id,

              requestedStatus:
                status,

              source,
            },
            "Failed to update message status.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Status history
  // =========================================================================

  async findStatusEvents(
    clientId: string,
    messageId: string,
  ) {
    const message =
      await this.findById(
        clientId,
        messageId,
      );

    return this.statusEvents.findByMessage(
      message.id,
    );
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private ensureClientOwnership(
    message: Awaited<
      ReturnType<
        MessageRepository["findById"]
      >
    >,
    clientId: string,
  ) {
    if (
      !message ||
      message.clientId !== clientId
    ) {
      throw new NotFoundException(
        "Message not found.",
      );
    }

    return message;
  }

  /**
   * Returns the queue responsible for
   * processing a particular non-terminal state.
   */
  private queueForStatus(
    status: MessageStatus,
  ): string {
    const queue =
      MessageService
        .QUEUE_BY_STATUS[status];

    if (!queue) {
      throw new Error(
        `No queue configured for message status: ${status}.`,
      );
    }

    return queue;
  }

  private assertValidTransition(
    currentStatus: MessageStatus,
    nextStatus: MessageStatus,
  ): void {
    const allowed =
      MessageService
        .ALLOWED_TRANSITIONS[
      currentStatus
      ];

    if (
      !allowed.includes(
        nextStatus,
      )
    ) {
      throw new Error(
        `Invalid message status transition: ${currentStatus} -> ${nextStatus}.`,
      );
    }
  }

  private generatePublicId(): string {
    return Buffer
      .from(
        this.random.bytes(10),
      )
      .toString("base64url")
      .slice(0, 20);
  }

  private generateEventId(): string {
    return Buffer
      .from(
        this.random.bytes(10),
      )
      .toString("base64url")
      .slice(0, 20);
  }

  private gsm7Length(
    body: string,
  ): number {
    let count = 0;

    for (const ch of body) {
      count +=
        MessageService
          .GSM7_EXTENDED_CHARS
          .has(ch)
          ? 2
          : 1;
    }

    return count;
  }

  private calculateSegmentCount(
    body: string,
    encoding: MessageEncoding,
  ): number {
    if (body.length === 0) {
      return 0;
    }

    switch (encoding) {
      case MessageEncoding.GSM7: {
        const length =
          this.gsm7Length(body);

        return length <= 160
          ? 1
          : Math.ceil(
            length / 153,
          );
      }

      case MessageEncoding.UCS2:
        return body.length <= 70
          ? 1
          : Math.ceil(
            body.length / 67,
          );

      case MessageEncoding.BINARY:
        return body.length <= 140
          ? 1
          : Math.ceil(
            body.length / 134,
          );

      default:
        throw new Error(
          `Unhandled encoding: ${encoding}`,
        );
    }
  }
}