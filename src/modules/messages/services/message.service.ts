import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  LedgerReferenceType,
  MessageEncoding,
  MessageStatus,
  SenderIdStatus,
} from "@prisma/client";

import {
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import * as XLSX from "xlsx";

import { ClockService } from "../../../common/services/clock.service.js";
import { RandomGenerator } from "../../../common/services/random.service.js";
import { FloatLedgerService } from "../../float-ledger/services/float-ledger.service.js";

import { MessageRepository } from "../../../repositories/messageRepository.js";
import { MessageStatusEventRepository } from "../../../repositories/messageStatusEventRepository.js";
import { OutboxEventRepository } from "../../../repositories/OutboxRepository.js";

import { SenderIdService } from "../../../modules/sender-ids/services/sender-id.service.js";
import type { CreateMessageDto } from "../dto/create-message.dto.js";
import { MessageWithRelations } from "../message.mapper.js";

interface BulkMessageRow {
  readonly rowNumber: number;
  readonly destination: unknown;
  readonly message: unknown;
  readonly senderId: unknown;
  readonly encoding: unknown;
}

interface UploadedSpreadsheet {
  readonly buffer: Buffer;
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
}

interface SpreadsheetValidationError {
  readonly row: number;
  readonly field: string;
  readonly message: string;
}

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

    private readonly senderIds:
      SenderIdService,
  ) { }

  // =========================================================================
  // Create
  // =========================================================================

  /**
   * Creates one or more messages through a single transaction.
   *
   * A single-message submission calls this method with a one-element array.
   * Spreadsheet submissions call this method with all validated messages.
   *
   * Everything that establishes an accepted message is persisted together:
   *
   *   1. Messages
   *   2. Float debits
   *   3. Status events
   *   4. Outbox events
   *
   * RabbitMQ is deliberately not touched here.
   */
async create(
  clientId: string,
  dtos: readonly CreateMessageDto[],
): Promise<MessageWithRelations[]> {
  return withSpan(
    "MessageService.create",
    async (span) => {
      if (dtos.length === 0) {
        throw new Error(
          "At least one message is required.",
        );
      }

      span.setAttributes({
        "client.id": clientId,
        "message.count": dtos.length,
      });

      try {
        const result =
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
              // Prepare messages
              // -----------------------------------------------------------

              const prepared =
                dtos.map((dto) => {
                  const publicId =
                    this.generatePublicId();

                  const segmentCount =
                    this.calculateSegmentCount(
                      dto.body,
                      dto.encoding,
                    );

                  return {
                    publicId,
                    dto,
                    segmentCount,
                  };
                });

              // -----------------------------------------------------------
              // Create messages
              // -----------------------------------------------------------

              const created =
                await messages.createManyAndReturn(
                  prepared.map(
                    ({
                      publicId,
                      dto,
                      segmentCount,
                    }) => ({
                      publicId,
                      clientId,
                      senderIdId:
                        dto.senderIdId ?? null,
                      destination:
                        dto.destination,
                      body: dto.body,
                      encoding:
                        dto.encoding,
                      segmentCount,
                      currentStatus:
                        MessageStatus.QUEUED,
                      submittedAt:
                        this.clock.now(),
                    }),
                  ),
                  prepared.map(
                    ({
                      publicId,
                    }) => publicId,
                  ),
                );

              // -----------------------------------------------------------
              // Debit float
              // -----------------------------------------------------------

              await float.debitMessages(
                clientId,
                created.map(
                  (message) => ({
                    messageId:
                      message.id,
                    publicId:
                      message.publicId,
                    segmentCount:
                      message.segmentCount,
                  }),
                ),
              );

              // -----------------------------------------------------------
              // Status history
              // -----------------------------------------------------------

              await statusEvents.createMany(
                created.map(
                  (message) => ({
                    messageId:
                      message.id,
                    status:
                      MessageStatus.QUEUED,
                    source:
                      "CONTROL_PLANE",
                    description:
                      "Message accepted and queued.",
                  }),
                ),
              );

              // -----------------------------------------------------------
              // Outbox
              // -----------------------------------------------------------

              await outbox.createMany(
                created.map(
                  (message) => ({
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
                  }),
                ),
              );

              return created;
            },
          );

        // ---------------------------------------------------------------
        // Logging
        // ---------------------------------------------------------------

        this.logger.info(
          {
            clientId,
            count:
              result.length,
            status:
              MessageStatus.QUEUED,
            queue:
              this.queueForStatus(
                MessageStatus.QUEUED,
              ),
          },
          "Messages accepted.",
        );

        return result;
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            err: error,
            clientId,
            count:
              dtos.length,
          },
          "Failed to create messages.",
        );

        throw error;
      }
    },
  );
}

  // =========================================================================
  // Bulk Create
  // =========================================================================

  /**
   * Parses, validates and prepares a spreadsheet for message creation.
   *
   * The spreadsheet is completely validated before create() is called.
   * Therefore, a validation failure results in zero persisted messages.
   *
   * Spreadsheet Sender IDs are human-readable Sender ID names. They are
   * resolved to the internal Sender ID UUID after validating client ownership
   * and approval status.
   */
  async createFromSpreadsheet(
    clientId: string,
    file: UploadedSpreadsheet,
  ) {
    return withSpan(
      "MessageService.createFromSpreadsheet",
      async (span) => {
        span.setAttributes({
          "client.id": clientId,

          "bulk.file.name":
            file.originalname,

          "bulk.file.size":
            file.size,
        });

        try {
          const rows =
            this.parseSpreadsheet(file);

          const messages =
            await this.validateAndPrepareMessages(
              clientId,
              rows,
            );

          span.setAttribute(
            "message.count",
            messages.length,
          );

          /*
           * All validated spreadsheet messages now
           * use the exact same persistence path as
           * normal message submission.
           */
          return await this.create(
            clientId,
            messages,
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId,

              fileName:
                file.originalname,

              fileSize:
                file.size,
            },
            "Failed to create messages from spreadsheet.",
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
      readonly page?: number;
      readonly pageSize?: number;
      readonly search?: string;
      readonly destination?: string;
      readonly senderIdId?: string;
      readonly status?: MessageStatus;
      readonly encoding?: MessageEncoding;
      readonly submittedFrom?: Date;
      readonly submittedTo?: Date;
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
   * processing a particular message state.
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

  // =========================================================================
  // Spreadsheet parsing
  // =========================================================================

  private parseSpreadsheet(
    file: UploadedSpreadsheet,
  ): readonly BulkMessageRow[] {
    if (!file?.buffer) {
      throw new BadRequestException(
        "Spreadsheet file is required.",
      );
    }

    if (file.size === 0) {
      throw new BadRequestException(
        "Spreadsheet file is empty.",
      );
    }

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(
        file.buffer,
        {
          type: "buffer",
          cellDates: false,
          cellNF: false,
          cellText: true,
        },
      );
    } catch {
      throw new BadRequestException(
        "Unable to read spreadsheet file.",
      );
    }

    if (
      workbook.SheetNames.length === 0
    ) {
      throw new BadRequestException(
        "Spreadsheet contains no worksheets.",
      );
    }

    const sheetName =
      workbook.SheetNames[0];

    const worksheet =
      workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new BadRequestException(
        "Spreadsheet worksheet could not be read.",
      );
    }

    const records =
      XLSX.utils.sheet_to_json<
        Record<string, unknown>
      >(worksheet, {
        defval: null,
        raw: false,
        blankrows: false,
      });

    if (records.length === 0) {
      throw new BadRequestException(
        "Spreadsheet contains no message rows.",
      );
    }

    return records.map(
      (record, index) => ({
        rowNumber:
          index + 2,

        destination:
          this.getColumnValue(
            record,
            "destination",
          ),

        message:
          this.getColumnValue(
            record,
            "message",
          ),

        senderId:
          this.getColumnValue(
            record,
            "senderId",
          ),

        encoding:
          this.getColumnValue(
            record,
            "encoding",
          ),
      }),
    );
  }

  private getColumnValue(
    row: Record<string, unknown>,
    column: string,
  ): unknown {
    const key =
      Object.keys(row).find(
        (value) =>
          value
            .trim()
            .toLowerCase() ===
          column.toLowerCase(),
      );

    return key
      ? row[key]
      : undefined;
  }

  async findManyPlatform(
    options?: {
      readonly page?: number;
      readonly pageSize?: number;
      readonly clientId?: string;
      readonly search?: string;
      readonly destination?: string;
      readonly senderIdId?: string;
      readonly status?: MessageStatus;
      readonly encoding?: MessageEncoding;
      readonly submittedFrom?: Date;
      readonly submittedTo?: Date;
    },
  ) {
    return withSpan(
      "MessageService.findManyPlatform",
      async (span) => {
        span.setAttributes({
          ...(options?.clientId
            ? {
              "client.id":
                options.clientId,
            }
            : {}),

          ...(options?.page !== undefined
            ? {
              "pagination.page":
                options.page,
            }
            : {}),

          ...(options?.pageSize !== undefined
            ? {
              "pagination.page_size":
                options.pageSize,
            }
            : {}),
        });

        try {
          const result =
            await this.messages.findManyPlatform(
              options,
            );

          span.setAttributes({
            "pagination.total_items":
              result.totalItems,

            "message.count":
              result.items.length,
          });

          this.logger.debug(
            {
              clientId:
                options?.clientId,

              page:
                result.page,

              pageSize:
                result.pageSize,

              totalItems:
                result.totalItems,

              count:
                result.items.length,
            },
            "Platform messages retrieved successfully.",
          );

          return result;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              clientId:
                options?.clientId,

              page:
                options?.page,

              pageSize:
                options?.pageSize,
            },
            "Failed to retrieve platform messages.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Spreadsheet validation
  // =========================================================================

  private async validateAndPrepareMessages(
    clientId: string,
    rows: readonly BulkMessageRow[],
  ): Promise<readonly CreateMessageDto[]> {
    const errors:
      SpreadsheetValidationError[] =
      [];

    const messages:
      CreateMessageDto[] =
      [];

    // -----------------------------------------------------------------------
    // Collect unique Sender ID names.
    //
    // The spreadsheet contains the human-readable Sender ID name rather than
    // the internal database UUID.
    // -----------------------------------------------------------------------

    const senderNames =
      new Set<string>();

    for (const row of rows) {
      const senderName =
        this.toStringValue(
          row.senderId,
        );

      if (senderName) {
        senderNames.add(
          senderName,
        );
      }
    }

    // -----------------------------------------------------------------------
    // Resolve all Sender IDs in one database query.
    //
    // The lookup is scoped to the client, so a Sender ID belonging to another
    // client will not be returned.
    // -----------------------------------------------------------------------

    const senderIds =
      await this.senderIds.findByNamesForClient(
        clientId,
        [...senderNames],
      );

    const senderIdsByName =
      new Map(
        senderIds.map(
          (senderId) => [
            senderId.sender,
            senderId,
          ],
        ),
      );

    // -----------------------------------------------------------------------
    // Validate spreadsheet rows.
    // -----------------------------------------------------------------------

    for (const row of rows) {
      const destination =
        this.toStringValue(
          row.destination,
        );

      const body =
        this.toStringValue(
          row.message,
        );

      const senderName =
        this.toStringValue(
          row.senderId,
        );

      const encoding =
        this.toStringValue(
          row.encoding,
        );

      // ---------------------------------------------------------------
      // Required fields
      // ---------------------------------------------------------------

      if (!destination) {
        errors.push({
          row: row.rowNumber,
          field: "destination",
          message:
            "Destination is required.",
        });
      }

      if (!body) {
        errors.push({
          row: row.rowNumber,
          field: "message",
          message:
            "Message is required.",
        });
      }

      if (!senderName) {
        errors.push({
          row: row.rowNumber,
          field: "senderId",
          message:
            "Sender ID is required.",
        });
      }

      if (!encoding) {
        errors.push({
          row: row.rowNumber,
          field: "encoding",
          message:
            "Encoding is required.",
        });
      }

      // ---------------------------------------------------------------
      // Destination
      // ---------------------------------------------------------------

      if (
        destination &&
        destination.length > 20
      ) {
        errors.push({
          row: row.rowNumber,
          field: "destination",
          message:
            "Destination must not exceed 20 characters.",
        });
      }

      // ---------------------------------------------------------------
      // Sender ID
      // ---------------------------------------------------------------

      let resolvedSenderId:
        string | undefined;

      if (senderName) {
        const senderId =
          senderIdsByName.get(
            senderName,
          );

        if (!senderId) {
          errors.push({
            row: row.rowNumber,
            field: "senderId",
            message:
              "Sender ID does not exist or does not belong to this client.",
          });
        } else if (
          senderId.status !==
          SenderIdStatus.APPROVED
        ) {
          errors.push({
            row: row.rowNumber,
            field: "senderId",
            message:
              "Sender ID is not approved.",
          });
        } else {
          resolvedSenderId =
            senderId.id;
        }
      }

      // ---------------------------------------------------------------
      // Encoding
      // ---------------------------------------------------------------

      let parsedEncoding:
        | MessageEncoding
        | undefined;

      if (encoding) {
        parsedEncoding =
          this.parseEncoding(
            encoding,
          );

        if (!parsedEncoding) {
          errors.push({
            row: row.rowNumber,
            field: "encoding",
            message:
              "Encoding must be GSM7, UCS2, or BINARY.",
          });
        }
      }

      // ---------------------------------------------------------------
      // Prepare DTO
      // ---------------------------------------------------------------

      if (
        destination &&
        body &&
        resolvedSenderId &&
        parsedEncoding
      ) {
        messages.push({
          senderIdId:
            resolvedSenderId,

          destination,

          body,

          encoding:
            parsedEncoding,
        });
      }
    }

    // -----------------------------------------------------------------------
    // Reject the entire spreadsheet if any row failed validation.
    // -----------------------------------------------------------------------

    if (errors.length > 0) {
      throw new BadRequestException({
        message:
          "Spreadsheet validation failed.",

        errors,
      });
    }

    return messages;
  }

  private toStringValue(
    value: unknown,
  ): string | undefined {
    if (
      value === undefined ||
      value === null
    ) {
      return undefined;
    }

    const result =
      String(value).trim();

    return result.length > 0
      ? result
      : undefined;
  }

  private parseEncoding(
    value: string,
  ): MessageEncoding | undefined {
    switch (
    value.trim().toUpperCase()
    ) {
      case "GSM7":
        return MessageEncoding.GSM7;

      case "UCS2":
        return MessageEncoding.UCS2;

      case "BINARY":
        return MessageEncoding.BINARY;

      default:
        return undefined;
    }
  }

  // =========================================================================
  // IDs
  // =========================================================================

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

  // =========================================================================
  // GSM-7 / segmentation
  // =========================================================================

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