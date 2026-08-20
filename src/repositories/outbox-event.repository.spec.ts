import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  OutboxEventStatus,
} from "@prisma/client";

import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";
import { OutboxEventRepository } from "./OutboxRepository.js";

describe("OutboxEventRepository", () => {
  let repository: OutboxEventRepository;

  const db = {
    outboxEvent: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const eventId = "event-1";

  const now =
    new Date("2026-08-19T10:00:00.000Z");

  const baseEvent = {
    id: eventId,
    eventType: "MESSAGE_SUBMISSION",
    aggregateType: "MESSAGE",
    aggregateId: "message-1",
    queueName: "sms.submit",
    payload: {
      messageId: "message-1",
    },
    status: OutboxEventStatus.PENDING,
    attempts: 0,
    availableAt: now,
    processingAt: null,
    publishedAt: null,
    lastError: null,
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
    jest.clearAllMocks();

    db.outboxEvent.create.mockResolvedValue(
      baseEvent,
    );

    db.outboxEvent.findUnique.mockResolvedValue(
      baseEvent,
    );

    db.outboxEvent.findMany.mockResolvedValue(
      [],
    );

    db.outboxEvent.update.mockResolvedValue(
      baseEvent,
    );

    db.outboxEvent.updateMany.mockResolvedValue({
      count: 1,
    });

    repository =
      new OutboxEventRepository(
        db as any,
      );
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("should create an outbox event", async () => {
      const data = {
        eventType:
          "MESSAGE_SUBMISSION",

        aggregateType:
          "MESSAGE",

        aggregateId:
          "message-1",

        queueName:
          "sms.submit",

        payload: {
          messageId:
            "message-1",
        },
      };

      const result =
        await repository.create(
          data as any,
        );

      expect(
        db.outboxEvent.create,
      ).toHaveBeenCalledWith({
        data,
      });

      expect(result).toEqual(
        baseEvent,
      );
    });

    it("should propagate database errors", async () => {
      db.outboxEvent.create
        .mockRejectedValueOnce(
          new Error(
            "Database unavailable",
          ),
        );

      await expect(
        repository.create({} as any),
      ).rejects.toThrow(
        "Database unavailable",
      );
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe("findById", () => {
    it("should find an event by ID", async () => {
      const result =
        await repository.findById(
          eventId,
        );

      expect(
        db.outboxEvent.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          id: eventId,
        },
      });

      expect(result).toEqual(
        baseEvent,
      );
    });

    it("should return null when event does not exist", async () => {
      db.outboxEvent.findUnique
        .mockResolvedValueOnce(
          null,
        );

      await expect(
        repository.findById(
          "missing",
        ),
      ).resolves.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findPending
  // -------------------------------------------------------------------------

  describe("findPending", () => {
    it("should find pending events that are available", async () => {
      db.outboxEvent.findMany
        .mockResolvedValueOnce([
          baseEvent,
        ]);

      const result =
        await repository.findPending(
          10,
        );

      expect(
        db.outboxEvent.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status:
              OutboxEventStatus.PENDING,

            availableAt: {
              lte: expect.any(Date),
            },
          },

          take: 10,
        }),
      );

      expect(result).toEqual([
        baseEvent,
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // claimPending
  // -------------------------------------------------------------------------

  describe("claimPending", () => {
    it("should claim pending events", async () => {
      db.outboxEvent.findMany
        .mockResolvedValueOnce([
          baseEvent,
        ]);

      db.outboxEvent.updateMany
        .mockResolvedValueOnce({
          count: 1,
        });

      db.outboxEvent.findMany
        .mockResolvedValueOnce([
          {
            ...baseEvent,
            status:
              OutboxEventStatus.PROCESSING,
            processingAt: now,
          },
        ]);

      const result =
        await repository.claimPending(
          10,
          now,
        );

      expect(
        db.outboxEvent.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: eventId,
          status:
            OutboxEventStatus.PENDING,
        },

        data: {
          status:
            OutboxEventStatus.PROCESSING,

          processingAt: now,
        },
      });

      expect(result).toEqual([
        {
          ...baseEvent,
          status:
            OutboxEventStatus.PROCESSING,
          processingAt: now,
        },
      ]);
    });

    it("should not return an event when another worker already claimed it", async () => {
      db.outboxEvent.findMany
        .mockResolvedValueOnce([
          baseEvent,
        ]);

      db.outboxEvent.updateMany
        .mockResolvedValueOnce({
          count: 0,
        });

      const result =
        await repository.claimPending(
          10,
          now,
        );

      expect(
        db.outboxEvent.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: eventId,
          status:
            OutboxEventStatus.PENDING,
        },

        data: {
          status:
            OutboxEventStatus.PROCESSING,

          processingAt: now,
        },
      });

      expect(
        result,
      ).toEqual([]);

      expect(
        db.outboxEvent.findMany,
      ).toHaveBeenCalledTimes(1);
    });

    it("should claim only events whose conditional update succeeds", async () => {
      const secondEvent = {
        ...baseEvent,
        id: "event-2",
      };

      db.outboxEvent.findMany
        .mockResolvedValueOnce([
          baseEvent,
          secondEvent,
        ]);

      db.outboxEvent.updateMany
        .mockResolvedValueOnce({
          count: 1,
        })
        .mockResolvedValueOnce({
          count: 0,
        });

      db.outboxEvent.findMany
        .mockResolvedValueOnce([
          {
            ...baseEvent,
            status:
              OutboxEventStatus.PROCESSING,
            processingAt: now,
          },
        ]);

      const result =
        await repository.claimPending(
          10,
          now,
        );

      expect(
        result,
      ).toHaveLength(1);

      expect(
        result[0].id,
      ).toBe(eventId);
    });

    it("should return no events when none are pending", async () => {
      db.outboxEvent.findMany
        .mockResolvedValueOnce([]);

      const result =
        await repository.claimPending(
          10,
          now,
        );

      expect(result).toEqual([]);

      expect(
        db.outboxEvent.updateMany,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // markPublished
  // -------------------------------------------------------------------------

  describe("markPublished", () => {
    it("should mark an event as published", async () => {
      await repository.markPublished(
        eventId,
      );

      expect(
        db.outboxEvent.update,
      ).toHaveBeenCalledWith({
        where: {
          id: eventId,
        },

        data: {
          status:
            OutboxEventStatus.PUBLISHED,

          publishedAt:
            expect.any(Date),

          lastError:
            null,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // markRetry
  // -------------------------------------------------------------------------

  describe("markRetry", () => {
    it("should return a failed event to pending", async () => {
      const retryAt =
        new Date(
          "2026-08-19T10:00:05.000Z",
        );

      await repository.markRetry(
        eventId,
        "RabbitMQ unavailable",
        retryAt,
      );

      expect(
        db.outboxEvent.update,
      ).toHaveBeenCalledWith({
        where: {
          id: eventId,
        },

        data: {
          status:
            OutboxEventStatus.PENDING,

          attempts: {
            increment: 1,
          },

          lastError:
            "RabbitMQ unavailable",

          availableAt:
            retryAt,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // markFailed
  // -------------------------------------------------------------------------

  describe("markFailed", () => {
    it("should permanently fail an event", async () => {
      const retryAt =
        new Date(
          "2026-08-19T10:05:00.000Z",
        );

      await repository.markFailed(
        eventId,
        "Maximum retry attempts exceeded",
        retryAt,
      );

      expect(
        db.outboxEvent.update,
      ).toHaveBeenCalledWith({
        where: {
          id: eventId,
        },

        data: {
          status:
            OutboxEventStatus.FAILED,

          attempts: {
            increment: 1,
          },

          lastError:
            "Maximum retry attempts exceeded",

          availableAt:
            retryAt,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // releaseStale
  // -------------------------------------------------------------------------

  describe("releaseStale", () => {
    it("should return stale processing events to pending", async () => {
      const before =
        new Date(
          "2026-08-19T09:55:00.000Z",
        );

      await repository.releaseStale(
        before,
        now,
      );

      expect(
        db.outboxEvent.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          status:
            OutboxEventStatus.PROCESSING,

          processingAt: {
            lt: before,
          },
        },

        data: {
          status:
            OutboxEventStatus.PENDING,

          processingAt:
            null,

          availableAt:
            now,
        },
      });
    });

    it("should return the number of released events", async () => {
      db.outboxEvent.updateMany
        .mockResolvedValueOnce({
          count: 3,
        });

      const result =
        await repository.releaseStale(
          new Date(
            "2026-08-19T09:55:00.000Z",
          ),
          now,
        );

      expect(result).toEqual({
        count: 3,
      });
    });

    it("should return zero when there are no stale events", async () => {
      db.outboxEvent.updateMany
        .mockResolvedValueOnce({
          count: 0,
        });

      const result =
        await repository.releaseStale(
          new Date(
            "2026-08-19T09:55:00.000Z",
          ),
          now,
        );

      expect(result).toEqual({
        count: 0,
      });
    });
  });
});