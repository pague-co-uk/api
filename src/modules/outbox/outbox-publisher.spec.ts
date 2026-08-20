import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  initTelemetry,
} from "@pague-co-uk/sms-gateway-telemetry";

import {
  OutboxEventStatus,
} from "@prisma/client";

import { OutboxPublisher } from "./outbox.publisher.js";

describe("OutboxPublisher", () => {
  let publisher: OutboxPublisher;

  const outbox = {
    claimPending: jest.fn(),
    markPublished: jest.fn(),
    markRetry: jest.fn(),
    markFailed: jest.fn(),
    releaseStale: jest.fn(),
  };

  const queue = {
    publish: jest.fn(),
  };

  const config = {
    outbox: {
      batchSize: 50,
      pollIntervalMillis: 1_000,
      staleAfterMillis: 300_000,
      maxAttempts: 10,
      retryInitialDelayMillis: 1_000,
      retryMaxDelayMillis: 60_000,
    },
  };

  const event = {
    id: "outbox-1",
    eventType: "MESSAGE_SUBMISSION",
    aggregateType: "MESSAGE",
    aggregateId: "message-1",
    queueName: "messages.queued",

    payload: {
      messageId: "message-1",
      publicId: "MSG-001",
    },

    attempts: 0,

    status: OutboxEventStatus.PROCESSING,

    processingAt:
      new Date("2026-08-19T10:00:00.000Z"),

    availableAt:
      new Date("2026-08-19T10:00:00.000Z"),

    publishedAt: null,
    failedAt: null,
    lastError: null,

    createdAt:
      new Date("2026-08-19T10:00:00.000Z"),

    updatedAt:
      new Date("2026-08-19T10:00:00.000Z"),
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

    outbox.claimPending
      .mockResolvedValue([]);

    outbox.releaseStale
      .mockResolvedValue({
        count: 0,
      });

    outbox.markPublished
      .mockResolvedValue(undefined);

    outbox.markRetry
      .mockResolvedValue(undefined);

    outbox.markFailed
      .mockResolvedValue(undefined);

    queue.publish
      .mockResolvedValue(undefined);

    publisher =
      new OutboxPublisher(
        outbox as any,
        queue as any,
        config as any,
      );

    // processOnce() is deliberately testable,
    // but lifecycle polling is disabled for unit tests.
    publisher["running"] = true;
  });

  // -------------------------------------------------------------------------
  // processOnce
  // -------------------------------------------------------------------------

  describe("processOnce", () => {
    it("should claim events using the configured batch size", async () => {
      await publisher.processOnce();

      expect(
        outbox.claimPending,
      ).toHaveBeenCalledWith(50);
    });

    it("should release stale events before claiming pending events", async () => {
      await publisher.processOnce();

      expect(
        outbox.releaseStale,
      ).toHaveBeenCalledTimes(1);

      expect(
        outbox.claimPending,
      ).toHaveBeenCalledTimes(1);
    });

    it("should not publish when there are no events", async () => {
      await publisher.processOnce();

      expect(
        queue.publish,
      ).not.toHaveBeenCalled();

      expect(
        outbox.markPublished,
      ).not.toHaveBeenCalled();
    });

    it("should publish every claimed event", async () => {
      outbox.claimPending.mockResolvedValue([
        event,
        {
          ...event,
          id: "outbox-2",
          aggregateId: "message-2",
          payload: {
            messageId: "message-2",
          },
        },
      ]);

      await publisher.processOnce();

      expect(
        queue.publish,
      ).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // Publishing
  // -------------------------------------------------------------------------

  describe("publishing", () => {
    it("should publish using the event queue and payload", async () => {
      outbox.claimPending.mockResolvedValue([
        event,
      ]);

      await publisher.processOnce();

      expect(
        queue.publish,
      ).toHaveBeenCalledWith(
        "messages.queued",
        {
          messageId: "message-1",
          publicId: "MSG-001",
        },
      );
    });

    it("should mark the event published after successful publication", async () => {
      outbox.claimPending.mockResolvedValue([
        event,
      ]);

      await publisher.processOnce();

      expect(
        queue.publish,
      ).toHaveBeenCalledTimes(1);

      expect(
        outbox.markPublished,
      ).toHaveBeenCalledWith(
        "outbox-1",
      );
    });

    it("should not mark the event published when publishing fails", async () => {
      outbox.claimPending.mockResolvedValue([
        event,
      ]);

      queue.publish.mockRejectedValueOnce(
        new Error("RabbitMQ unavailable"),
      );

      await publisher.processOnce();

      expect(
        outbox.markPublished,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Retry
  // -------------------------------------------------------------------------

  describe("retry", () => {
    it("should return a failed event to pending", async () => {
      outbox.claimPending.mockResolvedValue([
        event,
      ]);

      queue.publish.mockRejectedValueOnce(
        new Error("RabbitMQ unavailable"),
      );

      await publisher.processOnce();

      expect(
        outbox.markRetry,
      ).toHaveBeenCalledTimes(1);

      expect(
        outbox.markRetry,
      ).toHaveBeenCalledWith(
        "outbox-1",
        "RabbitMQ unavailable",
        expect.any(Date),
      );
    });

    it("should calculate exponential retry delay", async () => {
      outbox.claimPending.mockResolvedValue([
        {
          ...event,
          attempts: 2,
        },
      ]);

      queue.publish.mockRejectedValueOnce(
        new Error("RabbitMQ unavailable"),
      );

      const before = Date.now();

      await publisher.processOnce();

      const [
        ,
        ,
        availableAt,
      ] =
        outbox.markRetry.mock.calls[0];

      const delay =
        availableAt.getTime() -
        before;

      expect(delay).toBeGreaterThanOrEqual(
        3_000,
      );

      expect(delay).toBeLessThanOrEqual(
        5_000,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Permanent failure
  // -------------------------------------------------------------------------

  describe("permanent failure", () => {
    it("should permanently fail an event after the maximum attempts", async () => {
      outbox.claimPending.mockResolvedValue([
        {
          ...event,
          attempts: 9,
        },
      ]);

      queue.publish.mockRejectedValueOnce(
        new Error("RabbitMQ unavailable"),
      );

      await publisher.processOnce();

      expect(
        outbox.markFailed,
      ).toHaveBeenCalledWith(
        "outbox-1",
        "RabbitMQ unavailable",
        expect.any(Date),
      );

      expect(
        outbox.markRetry,
      ).not.toHaveBeenCalled();
    });

    it("should retry an event below the maximum attempts", async () => {
      outbox.claimPending.mockResolvedValue([
        {
          ...event,
          attempts: 8,
        },
      ]);

      queue.publish.mockRejectedValueOnce(
        new Error("RabbitMQ unavailable"),
      );

      await publisher.processOnce();

      expect(
        outbox.markRetry,
      ).toHaveBeenCalled();

      expect(
        outbox.markFailed,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Stale recovery
  // -------------------------------------------------------------------------

  describe("stale recovery", () => {
    it("should release stale processing events", async () => {
      outbox.releaseStale.mockResolvedValue({
        count: 3,
      });

      await publisher.processOnce();

      expect(
        outbox.releaseStale,
      ).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  describe("lifecycle", () => {
    it("should start processing on module initialization", async () => {
      const processSpy =
        jest.spyOn(
          publisher,
          "processOnce",
        );

      publisher.onModuleInit();

      await new Promise(
        (resolve) =>
          setImmediate(resolve),
      );

      expect(
        processSpy,
      ).toHaveBeenCalled();

      publisher.onModuleDestroy();
    });

    it("should stop processing after module destruction", async () => {
      publisher.onModuleInit();

      publisher.onModuleDestroy();

      await publisher.processOnce();

      expect(
        outbox.claimPending,
      ).not.toHaveBeenCalled();
    });
  });
});