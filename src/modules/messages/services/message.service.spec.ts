import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  LedgerReferenceType,
  MessageEncoding,
  MessageStatus,
} from "@prisma/client";

import {
  initTelemetry,
} from "@pague-co-uk/sms-gateway-telemetry";

import { ClockService } from "../../../common/services/clock.service.js";
import { RandomGenerator } from "../../../common/services/random.service.js";

import { MessageRepository } from "../../../repositories/messageRepository.js";
import {
  MessageStatusEventRepository,
} from "../../../repositories/messageStatusEventRepository.js";

import {
  OutboxEventRepository,
} from "../../../repositories/OutboxRepository.js";

import {
  FloatLedgerService,
} from "../../float-ledger/services/float-ledger.service.js";

import { MessageService } from "./message.service.js";

describe("MessageService", () => {
  let service: MessageService;

  const messages = {
    withTransaction: jest.fn(),
    withDatabase: jest.fn(),

    create: jest.fn(),

    findById: jest.fn(),
    findByPublicId: jest.fn(),
    findByClient: jest.fn(),

    updateStatus: jest.fn(),

    countByClient: jest.fn(),
  };

  const statusEvents = {
    withDatabase: jest.fn(),

    create: jest.fn(),
    findByMessage: jest.fn(),
  };

  const float = {
    withDatabase: jest.fn(),

    debit: jest.fn(),
    refund: jest.fn(),

    findByReference: jest.fn(),
  };

  const outbox = {
    withDatabase: jest.fn(),

    create: jest.fn(),
  };

  const random = {
    bytes: jest.fn(),
  };

  const clock = {
    now: jest.fn(),
  };

  const clientId = "client-1";
  const messageId = "message-1";
  const publicId = "MSG-001";

  const now = new Date(
    "2026-08-18T08:00:00.000Z",
  );

  const baseMessage = {
    id: messageId,

    publicId,

    clientId,

    senderIdId: "sender-1",

    destination: "265991234567",

    body: "Hello world",

    encoding: MessageEncoding.GSM7,

    segmentCount: 1,

    currentStatus: MessageStatus.QUEUED,

    submittedAt: now,

    createdAt: now,

    updatedAt: now,
  };

  beforeAll(() => {
    initTelemetry({
      enabled: false,

      service: {
        name: "control-plane-api-test",
        version: "test",
      },

      collector: {
        tracesEndpoint:
          "http://localhost:4318/v1/traces",

        metricsEndpoint:
          "http://localhost:4318/v1/metrics",

        logsEndpoint:
          "http://localhost:4318/v1/logs",
      },

      metrics: {
        exportIntervalMillis: 60_000,
      },

      registerShutdownHooks: false,
    });
  });

  beforeEach(() => {
    jest.resetAllMocks();

    // ---------------------------------------------------------------
    // Random / clock
    // ---------------------------------------------------------------

    random.bytes.mockReturnValue(
      Buffer.from("MSG-public-id"),
    );

    clock.now.mockReturnValue(now);

    // ---------------------------------------------------------------
    // Transaction-bound repositories
    // ---------------------------------------------------------------

    messages.withDatabase.mockReturnValue(
      messages,
    );

    statusEvents.withDatabase.mockReturnValue(
      statusEvents,
    );

    float.withDatabase.mockReturnValue(
      float,
    );

    outbox.withDatabase.mockReturnValue(
      outbox,
    );

    // ---------------------------------------------------------------
    // Database transaction
    // ---------------------------------------------------------------

    messages.withTransaction.mockImplementation(
      async (
        callback: (
          tx: unknown,
        ) => Promise<unknown>,
      ) => {
        return callback({});
      },
    );

    // ---------------------------------------------------------------
    // Message repository
    // ---------------------------------------------------------------

    messages.create.mockResolvedValue(
      baseMessage,
    );

    messages.findById.mockResolvedValue(
      baseMessage,
    );

    messages.findByPublicId.mockResolvedValue(
      baseMessage,
    );

    messages.findByClient.mockResolvedValue(
      [],
    );

    messages.countByClient.mockResolvedValue(
      0,
    );

    messages.updateStatus.mockImplementation(
      async (
        id: string,
        status: MessageStatus,
      ) => ({
        ...baseMessage,
        id,
        currentStatus: status,
      }),
    );

    // ---------------------------------------------------------------
    // Status event repository
    // ---------------------------------------------------------------

    statusEvents.create.mockResolvedValue({
      id: "status-event-1",
    });

    statusEvents.findByMessage.mockResolvedValue(
      [],
    );

    // ---------------------------------------------------------------
    // Float ledger
    // ---------------------------------------------------------------

    float.debit.mockResolvedValue({
      id: "ledger-debit-1",

      clientId,

      credits: -1,

      referenceType:
        LedgerReferenceType.MESSAGE,

      referenceId: messageId,
    });

    float.refund.mockResolvedValue({
      id: "ledger-refund-1",

      clientId,

      credits: 1,

      referenceType:
        LedgerReferenceType.MESSAGE,

      referenceId: messageId,
    });

    float.findByReference.mockResolvedValue(
      null,
    );

    // ---------------------------------------------------------------
    // Outbox
    // ---------------------------------------------------------------

    outbox.create.mockResolvedValue({
      id: "outbox-1",
    });

    // ---------------------------------------------------------------
    // Service
    // ---------------------------------------------------------------

    service =
      new MessageService(
        messages as unknown as MessageRepository,

        statusEvents as unknown as MessageStatusEventRepository,

        outbox as unknown as OutboxEventRepository,

        float as unknown as FloatLedgerService,

        random as unknown as RandomGenerator,

        clock as unknown as ClockService,
      );
  });

  // =================================================================
  // CREATE
  // =================================================================

  describe("create", () => {
    it(
      "should create a queued message, debit float, create status event and create an outbox event",
      async () => {
        const result =
          await service.create(
            clientId,
            {
              senderIdId: "sender-1",
              destination: "265991234567",
              body: "Hello world",
              encoding: MessageEncoding.GSM7,
            },
          );

        expect(
          messages.withTransaction,
        ).toHaveBeenCalledTimes(1);

        expect(
          messages.withDatabase,
        ).toHaveBeenCalled();

        expect(
          statusEvents.withDatabase,
        ).toHaveBeenCalled();

        expect(
          float.withDatabase,
        ).toHaveBeenCalled();

        expect(
          outbox.withDatabase,
        ).toHaveBeenCalled();

        expect(
          messages.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            publicId:
              expect.any(String),

            client: {
              connect: {
                id: clientId,
              },
            },

            senderId: {
              connect: {
                id: "sender-1",
              },
            },

            destination:
              "265991234567",

            body:
              "Hello world",

            encoding:
              MessageEncoding.GSM7,

            segmentCount: 1,

            currentStatus:
              MessageStatus.QUEUED,

            submittedAt: now,
          }),
        );

        expect(
          float.debit,
        ).toHaveBeenCalledWith(
          clientId,
          1,
          LedgerReferenceType.MESSAGE,
          messageId,
          expect.stringContaining(
            "Message submission",
          ),
        );

        expect(
          statusEvents.create,
        ).toHaveBeenCalledWith({
          message: {
            connect: {
              id: messageId,
            },
          },

          status:
            MessageStatus.QUEUED,

          source:
            "CONTROL_PLANE",

          description:
            "Message accepted and queued.",
        });

        expect(
          outbox.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType:
              "MESSAGE_STATUS",

            aggregateType:
              "MESSAGE",

            aggregateId:
              messageId,

            queueName:
              "sms.queued",

            payload:
              expect.objectContaining({
                messageId,

                publicId,

                clientId,

                status:
                  MessageStatus.QUEUED,
              }),
          }),
        );

        expect(result).toEqual(
          baseMessage,
        );
      },
    );

    it(
      "should create a message without a sender ID",
      async () => {
        await service.create(
          clientId,
          {
            destination:
              "265991234567",

            body:
              "Hello world",

            encoding:
              MessageEncoding.GSM7,
          },
        );

        expect(
          messages.create,
        ).toHaveBeenCalledWith(
          expect.not.objectContaining({
            senderId:
              expect.anything(),
          }),
        );
      },
    );

    it(
      "should debit float by the calculated segment count",
      async () => {
        await service.create(
          clientId,
          {
            destination:
              "265991234567",

            body:
              "A".repeat(161),

            encoding:
              MessageEncoding.GSM7,
          },
        );

        expect(
          float.debit,
        ).toHaveBeenCalledWith(
          clientId,
          2,
          LedgerReferenceType.MESSAGE,
          messageId,
          expect.any(String),
        );
      },
    );

    it(
      "should generate a public ID",
      async () => {
        await service.create(
          clientId,
          {
            destination:
              "265991234567",

            body:
              "Hello world",

            encoding:
              MessageEncoding.GSM7,
          },
        );

        expect(
          random.bytes,
        ).toHaveBeenCalledWith(10);

        expect(
          messages.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            publicId:
              expect.any(String),
          }),
        );
      },
    );

    it(
      "should calculate one GSM7 segment for a short message",
      async () => {
        await service.create(
          clientId,
          {
            destination:
              "265991234567",

            body:
              "A".repeat(160),

            encoding:
              MessageEncoding.GSM7,
          },
        );

        expect(
          messages.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            segmentCount: 1,
          }),
        );
      },
    );

    it(
      "should calculate multiple GSM7 segments",
      async () => {
        await service.create(
          clientId,
          {
            destination:
              "265991234567",

            body:
              "A".repeat(161),

            encoding:
              MessageEncoding.GSM7,
          },
        );

        expect(
          messages.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            segmentCount: 2,
          }),
        );
      },
    );

    it(
      "should calculate GSM7 extended characters correctly",
      async () => {
        await service.create(
          clientId,
          {
            destination:
              "265991234567",

            body:
              "€".repeat(81),

            encoding:
              MessageEncoding.GSM7,
          },
        );

        /*
         * € consumes two GSM-7 septets.
         *
         * 81 × 2 = 162 septets.
         *
         * Concatenated GSM-7 messages use
         * 153 septets per segment.
         *
         * Therefore:
         *
         * 162 / 153 = 2 segments.
         */

        expect(
          messages.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            segmentCount: 2,
          }),
        );
      },
    );

    it(
      "should calculate one UCS2 segment for a short message",
      async () => {
        await service.create(
          clientId,
          {
            destination:
              "265991234567",

            body:
              "A".repeat(70),

            encoding:
              MessageEncoding.UCS2,
          },
        );

        expect(
          messages.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            segmentCount: 1,
          }),
        );
      },
    );

    it(
      "should calculate multiple UCS2 segments",
      async () => {
        await service.create(
          clientId,
          {
            destination:
              "265991234567",

            body:
              "A".repeat(71),

            encoding:
              MessageEncoding.UCS2,
          },
        );

        expect(
          messages.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            segmentCount: 2,
          }),
        );
      },
    );

    it(
      "should calculate BINARY segments",
      async () => {
        await service.create(
          clientId,
          {
            destination:
              "265991234567",

            body:
              "A".repeat(141),

            encoding:
              MessageEncoding.BINARY,
          },
        );

        expect(
          messages.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            segmentCount: 2,
          }),
        );
      },
    );

    it(
      "should propagate transaction errors",
      async () => {
        messages.withTransaction.mockRejectedValueOnce(
          new Error(
            "Transaction failed",
          ),
        );

        await expect(
          service.create(
            clientId,
            {
              destination:
                "265991234567",

              body:
                "Hello",

              encoding:
                MessageEncoding.GSM7,
            },
          ),
        ).rejects.toThrow(
          "Transaction failed",
        );
      },
    );

    it(
      "should propagate float debit errors",
      async () => {
        float.debit.mockRejectedValueOnce(
          new Error(
            "Insufficient float balance.",
          ),
        );

        await expect(
          service.create(
            clientId,
            {
              destination:
                "265991234567",

              body:
                "Hello",

              encoding:
                MessageEncoding.GSM7,
            },
          ),
        ).rejects.toThrow(
          "Insufficient float balance.",
        );

        expect(
          statusEvents.create,
        ).not.toHaveBeenCalled();

        expect(
          outbox.create,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "should propagate outbox errors",
      async () => {
        outbox.create.mockRejectedValueOnce(
          new Error(
            "Outbox unavailable",
          ),
        );

        await expect(
          service.create(
            clientId,
            {
              destination:
                "265991234567",

              body:
                "Hello",

              encoding:
                MessageEncoding.GSM7,
            },
          ),
        ).rejects.toThrow(
          "Outbox unavailable",
        );
      },
    );

    it(
      "should not publish directly to RabbitMQ",
      async () => {
        await service.create(
          clientId,
          {
            destination:
              "265991234567",

            body:
              "Hello",

            encoding:
              MessageEncoding.GSM7,
          },
        );

        /*
         * There is deliberately no QueueClient
         * dependency in MessageService.
         *
         * MessageService only creates the outbox
         * event. OutboxPublisher owns RabbitMQ.
         */

        expect(
          outbox.create,
        ).toHaveBeenCalled();
      },
    );
  });

  // =================================================================
  // FIND BY CLIENT
  // =================================================================

  describe("findByClient", () => {
    it(
      "should retrieve messages for a client",
      async () => {
        const entries = [
          baseMessage,
        ];

        messages.findByClient.mockResolvedValue(
          entries,
        );

        const result =
          await service.findByClient(
            clientId,
          );

        expect(
          messages.findByClient,
        ).toHaveBeenCalledWith(
          clientId,
          undefined,
        );

        expect(result).toEqual(
          entries,
        );
      },
    );

    it(
      "should pass query options",
      async () => {
        await service.findByClient(
          clientId,
          {
            limit: 25,
            offset: 50,
            status:
              MessageStatus.DELIVERED,
          },
        );

        expect(
          messages.findByClient,
        ).toHaveBeenCalledWith(
          clientId,
          {
            limit: 25,
            offset: 50,
            status:
              MessageStatus.DELIVERED,
          },
        );
      },
    );
  });

  // =================================================================
  // FIND BY ID
  // =================================================================

  describe("findById", () => {
    it(
      "should retrieve a message belonging to the client",
      async () => {
        const result =
          await service.findById(
            clientId,
            messageId,
          );

        expect(
          messages.findById,
        ).toHaveBeenCalledWith(
          messageId,
        );

        expect(result).toEqual(
          baseMessage,
        );
      },
    );

    it(
      "should reject a message belonging to another client",
      async () => {
        messages.findById.mockResolvedValue(
          {
            ...baseMessage,
            clientId:
              "other-client",
          },
        );

        await expect(
          service.findById(
            clientId,
            messageId,
          ),
        ).rejects.toThrow(
          "Message not found.",
        );
      },
    );

    it(
      "should reject a missing message",
      async () => {
        messages.findById.mockResolvedValue(
          null,
        );

        await expect(
          service.findById(
            clientId,
            messageId,
          ),
        ).rejects.toThrow(
          "Message not found.",
        );
      },
    );
  });

  // =================================================================
  // FIND BY PUBLIC ID
  // =================================================================

  describe("findByPublicId", () => {
    it(
      "should retrieve a message by public ID",
      async () => {
        const result =
          await service.findByPublicId(
            clientId,
            publicId,
          );

        expect(
          messages.findByPublicId,
        ).toHaveBeenCalledWith(
          publicId,
        );

        expect(result).toEqual(
          baseMessage,
        );
      },
    );

    it(
      "should reject a message belonging to another client",
      async () => {
        messages.findByPublicId.mockResolvedValue(
          {
            ...baseMessage,
            clientId:
              "other-client",
          },
        );

        await expect(
          service.findByPublicId(
            clientId,
            publicId,
          ),
        ).rejects.toThrow(
          "Message not found.",
        );
      },
    );

    it(
      "should reject a missing message",
      async () => {
        messages.findByPublicId.mockResolvedValue(
          null,
        );

        await expect(
          service.findByPublicId(
            clientId,
            publicId,
          ),
        ).rejects.toThrow(
          "Message not found.",
        );
      },
    );
  });

  // =================================================================
  // COUNT
  // =================================================================

  describe("countByClient", () => {
    it(
      "should count messages for a client",
      async () => {
        messages.countByClient.mockResolvedValue(
          125,
        );

        const result =
          await service.countByClient(
            clientId,
          );

        expect(
          messages.countByClient,
        ).toHaveBeenCalledWith(
          clientId,
          undefined,
        );

        expect(result).toBe(125);
      },
    );

    it(
      "should count messages by status",
      async () => {
        messages.countByClient.mockResolvedValue(
          25,
        );

        const result =
          await service.countByClient(
            clientId,
            MessageStatus.DELIVERED,
          );

        expect(
          messages.countByClient,
        ).toHaveBeenCalledWith(
          clientId,
          MessageStatus.DELIVERED,
        );

        expect(result).toBe(25);
      },
    );
  });

  // =================================================================
  // UPDATE STATUS
  // =================================================================

  describe("updateStatus", () => {
    it(
      "should transition QUEUED to ROUTED",
      async () => {
        messages.findById
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.QUEUED,
          })
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.QUEUED,
          });

        const updated = {
          ...baseMessage,
          currentStatus:
            MessageStatus.ROUTED,
        };

        messages.updateStatus.mockResolvedValue(
          updated,
        );

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.ROUTED,
            "ROUTER",
            "Message routed.",
          );

        expect(
          messages.updateStatus,
        ).toHaveBeenCalledWith(
          messageId,
          MessageStatus.ROUTED,
        );

        expect(
          statusEvents.create,
        ).toHaveBeenCalledWith({
          message: {
            connect: {
              id: messageId,
            },
          },

          status:
            MessageStatus.ROUTED,

          source:
            "ROUTER",

          description:
            "Message routed.",
        });

        expect(
          outbox.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType:
              "MESSAGE_STATUS",

            aggregateType:
              "MESSAGE",

            aggregateId:
              messageId,

            queueName:
              "sms.routed",

            payload:
              expect.objectContaining({
                messageId,

                previousStatus:
                  MessageStatus.QUEUED,

                status:
                  MessageStatus.ROUTED,
              }),
          }),
        );

        expect(
          float.refund,
        ).not.toHaveBeenCalled();

        expect(result).toEqual(
          updated,
        );
      },
    );

    it(
      "should transition ROUTED to SUBMITTED",
      async () => {
        messages.findById
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.ROUTED,
          })
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.ROUTED,
          });

        const updated = {
          ...baseMessage,
          currentStatus:
            MessageStatus.SUBMITTED,
        };

        messages.updateStatus.mockResolvedValue(
          updated,
        );

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.SUBMITTED,
            "SMPP",
            "Submitted to provider.",
          );

        expect(
          messages.updateStatus,
        ).toHaveBeenCalledWith(
          messageId,
          MessageStatus.SUBMITTED,
        );

        expect(
          statusEvents.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            status:
              MessageStatus.SUBMITTED,

            source:
              "SMPP",

            description:
              "Submitted to provider.",
          }),
        );

        expect(
          outbox.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType:
              "MESSAGE_STATUS",

            queueName:
              "sms.submitted",

            payload:
              expect.objectContaining({
                messageId,

                previousStatus:
                  MessageStatus.ROUTED,

                status:
                  MessageStatus.SUBMITTED,
              }),
          }),
        );

        expect(
          float.refund,
        ).not.toHaveBeenCalled();

        expect(result).toEqual(
          updated,
        );
      },
    );

    it(
      "should transition ROUTED to FAILED and refund the message",
      async () => {
        messages.findById
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.ROUTED,
          })
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.ROUTED,
          });

        const updated = {
          ...baseMessage,
          currentStatus:
            MessageStatus.FAILED,
        };

        messages.updateStatus.mockResolvedValue(
          updated,
        );

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.FAILED,
            "ROUTER",
            "Routing failed.",
          );

        expect(
          messages.updateStatus,
        ).toHaveBeenCalledWith(
          messageId,
          MessageStatus.FAILED,
        );

        expect(
          float.refund,
        ).toHaveBeenCalledWith(
          clientId,
          baseMessage.segmentCount,
          LedgerReferenceType.MESSAGE,
          messageId,
          expect.stringContaining(
            "failed refund",
          ),
        );

        expect(
          statusEvents.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            status:
              MessageStatus.FAILED,

            source:
              "ROUTER",

            description:
              "Routing failed.",
          }),
        );

        expect(
          outbox.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            queueName:
              "sms.failed",

            payload:
              expect.objectContaining({
                messageId,

                previousStatus:
                  MessageStatus.ROUTED,

                status:
                  MessageStatus.FAILED,
              }),
          }),
        );

        expect(result).toEqual(
          updated,
        );
      },
    );

    it(
      "should transition SUBMITTED to DELIVERED without refund",
      async () => {
        messages.findById
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.SUBMITTED,
          })
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.SUBMITTED,
          });

        const updated = {
          ...baseMessage,
          currentStatus:
            MessageStatus.DELIVERED,
        };

        messages.updateStatus.mockResolvedValue(
          updated,
        );

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.DELIVERED,
            "DLR",
            "Message delivered.",
          );

        expect(
          messages.updateStatus,
        ).toHaveBeenCalledWith(
          messageId,
          MessageStatus.DELIVERED,
        );

        expect(
          float.refund,
        ).not.toHaveBeenCalled();

        expect(
          outbox.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            queueName:
              "sms.delivered",

            payload:
              expect.objectContaining({
                messageId,

                previousStatus:
                  MessageStatus.SUBMITTED,

                status:
                  MessageStatus.DELIVERED,
              }),
          }),
        );

        expect(result).toEqual(
          updated,
        );
      },
    );

    it(
      "should transition SUBMITTED to FAILED and refund",
      async () => {
        messages.findById
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.SUBMITTED,
          })
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.SUBMITTED,
          });

        const updated = {
          ...baseMessage,
          currentStatus:
            MessageStatus.FAILED,
        };

        messages.updateStatus.mockResolvedValue(
          updated,
        );

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.FAILED,
            "SMPP",
            "Provider rejected message.",
          );

        expect(
          messages.updateStatus,
        ).toHaveBeenCalledWith(
          messageId,
          MessageStatus.FAILED,
        );

        expect(
          float.refund,
        ).toHaveBeenCalledWith(
          clientId,
          baseMessage.segmentCount,
          LedgerReferenceType.MESSAGE,
          messageId,
          expect.stringContaining(
            "failed refund",
          ),
        );

        expect(
          outbox.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            queueName:
              "sms.failed",

            payload:
              expect.objectContaining({
                messageId,

                previousStatus:
                  MessageStatus.SUBMITTED,

                status:
                  MessageStatus.FAILED,
              }),
          }),
        );

        expect(result).toEqual(
          updated,
        );
      },
    );

    it(
      "should transition SUBMITTED to EXPIRED and refund",
      async () => {
        messages.findById
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.SUBMITTED,
          })
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.SUBMITTED,
          });

        const updated = {
          ...baseMessage,
          currentStatus:
            MessageStatus.EXPIRED,
        };

        messages.updateStatus.mockResolvedValue(
          updated,
        );

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.EXPIRED,
            "DELIVERY_TIMEOUT",
            "Delivery timeout.",
          );

        expect(
          messages.updateStatus,
        ).toHaveBeenCalledWith(
          messageId,
          MessageStatus.EXPIRED,
        );

        expect(
          float.refund,
        ).toHaveBeenCalledWith(
          clientId,
          baseMessage.segmentCount,
          LedgerReferenceType.MESSAGE,
          messageId,
          expect.stringContaining(
            "expired refund",
          ),
        );

        expect(
          outbox.create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            queueName:
              "sms.expired",

            payload:
              expect.objectContaining({
                messageId,

                previousStatus:
                  MessageStatus.SUBMITTED,

                status:
                  MessageStatus.EXPIRED,
              }),
          }),
        );

        expect(result).toEqual(
          updated,
        );
      },
    );

    // ---------------------------------------------------------------
    // Invalid transitions
    // ---------------------------------------------------------------

    it(
      "should reject QUEUED to SUBMITTED",
      async () => {
        await expect(
          service.updateStatus(
            clientId,
            messageId,
            MessageStatus.SUBMITTED,
            "SMPP",
          ),
        ).rejects.toThrow(
          "Invalid message status transition: QUEUED -> SUBMITTED.",
        );

        expect(
          messages.withTransaction,
        ).not.toHaveBeenCalled();

        expect(
          outbox.create,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "should reject QUEUED to DELIVERED",
      async () => {
        await expect(
          service.updateStatus(
            clientId,
            messageId,
            MessageStatus.DELIVERED,
            "DLR",
          ),
        ).rejects.toThrow(
          "Invalid message status transition: QUEUED -> DELIVERED.",
        );

        expect(
          messages.withTransaction,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "should reject ROUTED to DELIVERED",
      async () => {
        messages.findById.mockResolvedValue({
          ...baseMessage,
          currentStatus:
            MessageStatus.ROUTED,
        });

        await expect(
          service.updateStatus(
            clientId,
            messageId,
            MessageStatus.DELIVERED,
            "DLR",
          ),
        ).rejects.toThrow(
          "Invalid message status transition: ROUTED -> DELIVERED.",
        );

        expect(
          messages.withTransaction,
        ).not.toHaveBeenCalled();
      },
    );

    // ---------------------------------------------------------------
    // Terminal states
    // ---------------------------------------------------------------

    it(
      "should not mutate a DELIVERED message",
      async () => {
        messages.findById.mockResolvedValue({
          ...baseMessage,
          currentStatus:
            MessageStatus.DELIVERED,
        });

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.FAILED,
            "SMPP",
          );

        expect(
          result.currentStatus,
        ).toBe(
          MessageStatus.DELIVERED,
        );

        expect(
          messages.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
          float.refund,
        ).not.toHaveBeenCalled();

        expect(
          outbox.create,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "should not mutate a FAILED message when a late DELIVERED event arrives",
      async () => {
        messages.findById.mockResolvedValue({
          ...baseMessage,
          currentStatus:
            MessageStatus.FAILED,
        });

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.DELIVERED,
            "DLR",
          );

        expect(
          result.currentStatus,
        ).toBe(
          MessageStatus.FAILED,
        );

        expect(
          messages.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
          outbox.create,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "should not mutate an EXPIRED message when a late DELIVERED event arrives",
      async () => {
        messages.findById.mockResolvedValue({
          ...baseMessage,
          currentStatus:
            MessageStatus.EXPIRED,
        });

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.DELIVERED,
            "DLR",
          );

        expect(
          result.currentStatus,
        ).toBe(
          MessageStatus.EXPIRED,
        );

        expect(
          messages.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
          outbox.create,
        ).not.toHaveBeenCalled();
      },
    );

    // ---------------------------------------------------------------
    // Idempotency
    // ---------------------------------------------------------------

    it(
      "should treat the same transient status as idempotent",
      async () => {
        messages.findById.mockResolvedValue({
          ...baseMessage,
          currentStatus:
            MessageStatus.ROUTED,
        });

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.ROUTED,
            "ROUTER",
          );

        expect(
          result.currentStatus,
        ).toBe(
          MessageStatus.ROUTED,
        );

        expect(
          messages.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
          statusEvents.create,
        ).not.toHaveBeenCalled();

        expect(
          outbox.create,
        ).not.toHaveBeenCalled();

        expect(
          float.refund,
        ).not.toHaveBeenCalled();
      },
    );

    // ---------------------------------------------------------------
    // Stale worker
    // ---------------------------------------------------------------

    it(
      "should not process a stale worker after another worker reaches a terminal state",
      async () => {
        messages.findById
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.ROUTED,
          })
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.FAILED,
          });

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.SUBMITTED,
            "SMPP",
          );

        expect(
          result.currentStatus,
        ).toBe(
          MessageStatus.FAILED,
        );

        expect(
          messages.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
          outbox.create,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "should not process a stale worker after another worker reaches the requested status",
      async () => {
        messages.findById
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.ROUTED,
          })
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.SUBMITTED,
          });

        const result =
          await service.updateStatus(
            clientId,
            messageId,
            MessageStatus.SUBMITTED,
            "SMPP",
          );

        expect(
          result.currentStatus,
        ).toBe(
          MessageStatus.SUBMITTED,
        );

        expect(
          messages.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
          outbox.create,
        ).not.toHaveBeenCalled();
      },
    );

    // ---------------------------------------------------------------
    // Ownership
    // ---------------------------------------------------------------

    it(
      "should reject a message belonging to another client",
      async () => {
        messages.findById.mockResolvedValue({
          ...baseMessage,
          clientId:
            "other-client",
        });

        await expect(
          service.updateStatus(
            clientId,
            messageId,
            MessageStatus.ROUTED,
            "ROUTER",
          ),
        ).rejects.toThrow(
          "Message not found.",
        );

        expect(
          messages.withTransaction,
        ).not.toHaveBeenCalled();
      },
    );

    // ---------------------------------------------------------------
    // Raw status data
    // ---------------------------------------------------------------

    it(
      "should include raw status data",
      async () => {
        messages.findById
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.ROUTED,
          })
          .mockResolvedValueOnce({
            ...baseMessage,
            currentStatus:
              MessageStatus.ROUTED,
          });

        await service.updateStatus(
          clientId,
          messageId,
          MessageStatus.SUBMITTED,
          "SMPP",
          "Submitted to provider.",
          {
            providerMessageId:
              "provider-123",
          },
        );

        expect(
          statusEvents.create,
        ).toHaveBeenCalledWith({
          message: {
            connect: {
              id: messageId,
            },
          },

          status:
            MessageStatus.SUBMITTED,

          source:
            "SMPP",

          description:
            "Submitted to provider.",

          rawData: {
            providerMessageId:
              "provider-123",
          },
        });
      },
    );

    // ---------------------------------------------------------------
    // Transaction errors
    // ---------------------------------------------------------------

    it(
      "should propagate transaction errors",
      async () => {
        messages.withTransaction.mockRejectedValueOnce(
          new Error(
            "Transaction failed",
          ),
        );

        await expect(
          service.updateStatus(
            clientId,
            messageId,
            MessageStatus.ROUTED,
            "ROUTER",
          ),
        ).rejects.toThrow(
          "Transaction failed",
        );
      },
    );
  });

  // =================================================================
  // STATUS HISTORY
  // =================================================================

  describe("findStatusEvents", () => {
    it(
      "should retrieve status history for a client's message",
      async () => {
        const events = [
          {
            id: "event-1",
            messageId,
            status:
              MessageStatus.QUEUED,
          },

          {
            id: "event-2",
            messageId,
            status:
              MessageStatus.ROUTED,
          },
        ];

        statusEvents.findByMessage.mockResolvedValue(
          events,
        );

        const result =
          await service.findStatusEvents(
            clientId,
            messageId,
          );

        expect(
          statusEvents.findByMessage,
        ).toHaveBeenCalledWith(
          messageId,
        );

        expect(result).toEqual(
          events,
        );
      },
    );

    it(
      "should reject a message belonging to another client",
      async () => {
        messages.findById.mockResolvedValue({
          ...baseMessage,
          clientId:
            "other-client",
        });

        await expect(
          service.findStatusEvents(
            clientId,
            messageId,
          ),
        ).rejects.toThrow(
          "Message not found.",
        );

        expect(
          statusEvents.findByMessage,
        ).not.toHaveBeenCalled();
      },
    );
  });
});