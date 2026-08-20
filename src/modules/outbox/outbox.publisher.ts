import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";

import {
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import type {
  QueueClient,
} from "@pague-co-uk/sms-gateway-queue-client";

import { AppConfigService } from "../../config/config.service.js";
import { QUEUE_CLIENT } from "../../queue/constants/queue.constants.js";
import { OutboxEventRepository } from "../../repositories/OutboxRepository.js";

@Injectable()
export class OutboxPublisher
  implements OnModuleInit, OnModuleDestroy {

  private readonly logger =
    getComponentLogger(
      OutboxPublisher.name,
    );

  private running = false;

  private timer?: NodeJS.Timeout;

  constructor(
    private readonly outbox:
      OutboxEventRepository,

    @Inject(QUEUE_CLIENT)
    private readonly queue:
      QueueClient,

    private readonly config:
      AppConfigService,
  ) { }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  onModuleInit(): void {
    this.running = true;

    void this.processOnce();

    this.timer =
      setInterval(
        () => {
          void this.processOnce();
        },
        this.config.outbox.pollIntervalMillis,
      );
  }

  onModuleDestroy(): void {
    this.running = false;

    if (this.timer) {
      clearInterval(
        this.timer,
      );

      this.timer = undefined;
    }
  }

  // -------------------------------------------------------------------------
  // Processing
  // -------------------------------------------------------------------------

  async processOnce(): Promise<void> {
    if (!this.running) {
      return;
    }

    await withSpan(
      "OutboxPublisher.process",
      async () => {
        try {
          await this.releaseStaleEvents();

          const events =
            await this.outbox.claimPending(
              this.config.outbox.batchSize,
            );

          for (const event of events) {
            await this.publish(event);
          }
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
            },
            "Outbox processing failed.",
          );
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Publish
  // -------------------------------------------------------------------------

  private async publish(
    event: Awaited<
      ReturnType<
        OutboxEventRepository["claimPending"]
      >
    >[number],
  ): Promise<void> {
    await withSpan(
      "OutboxPublisher.publish",
      async (span) => {
        span.setAttributes({
          "outbox.event_id":
            event.id,

          "outbox.event_type":
            event.eventType,

          "outbox.aggregate_type":
            event.aggregateType,

          "outbox.aggregate_id":
            event.aggregateId,

          "outbox.queue":
            event.queueName,

          "outbox.attempt":
            event.attempts + 1,
        });

        try {
          await this.queue.publish(
            event.queueName,
            event.payload,
          );

          await this.outbox.markPublished(
            event.id,
          );

          this.logger.info(
            {
              eventId:
                event.id,

              eventType:
                event.eventType,

              queueName:
                event.queueName,
            },
            "Outbox event published.",
          );
        } catch (error) {
          recordException(error);

          await this.handlePublishFailure(
            event,
            error,
          );
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Failure handling
  // -------------------------------------------------------------------------

  private async handlePublishFailure(
    event: Awaited<
      ReturnType<
        OutboxEventRepository["claimPending"]
      >
    >[number],
    error: unknown,
  ): Promise<void> {
    const attempts =
      event.attempts + 1;

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    if (
      attempts >=
      this.config.outbox.maxAttempts
    ) {
      await this.outbox.markFailed(
        event.id,
        message,
        new Date(),
      );

      this.logger.error(
        {
          eventId:
            event.id,

          eventType:
            event.eventType,

          attempts,

          err: error,
        },
        "Outbox event permanently failed.",
      );

      return;
    }

    const delay =
      this.calculateRetryDelay(
        attempts,
      );

    const availableAt =
      new Date(
        Date.now() + delay,
      );

    await this.outbox.markRetry(
      event.id,
      message,
      availableAt,
    );

    this.logger.warn(
      {
        eventId:
          event.id,

        eventType:
          event.eventType,

        attempts,

        retryAt:
          availableAt,

        err: error,
      },
      "Outbox event scheduled for retry.",
    );
  }

  // -------------------------------------------------------------------------
  // Stale processing recovery
  // -------------------------------------------------------------------------

  private async releaseStaleEvents(): Promise<void> {
    const now =
      new Date();

    const before =
      new Date(
        now.getTime() -
        this.config.outbox.staleAfterMillis,
      );

    const result =
      await this.outbox.releaseStale(
        before,
        now,
      );

    if (
      result.count > 0
    ) {
      this.logger.warn(
        {
          count:
            result.count,
        },
        "Released stale outbox events.",
      );
    }
  }

  // -------------------------------------------------------------------------
  // Retry policy
  // -------------------------------------------------------------------------

  private calculateRetryDelay(
    attempts: number,
  ): number {
    const base =
      1_000;

    const maximum =
      60_000;

    return Math.min(
      base *
      Math.pow(
        2,
        attempts - 1,
      ),
      maximum,
    );
  }
}