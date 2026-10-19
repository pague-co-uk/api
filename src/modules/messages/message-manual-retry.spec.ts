import { describe, expect, it } from "@jest/globals";
import { MessageRepository } from "../../repositories/messageRepository.js";
import { MessageService } from "./services/message.service.js";
import { MessagesController } from "./controllers/messages.controller.js";
import { AUTHORIZE_METADATA } from "../../common/authorization/constants/authorization.constants.js";
import { Permissions } from "../../common/authorization/permissions/permissions.registry.js";

function fixture(status = "FAILED", clientId = "client", attemptStatus = "FAILED", failOutbox = false) {
  let state = { message: { id: "message", clientId, currentStatus: status }, events: [] as any[], outbox: [] as any[] };
  let pending = Promise.resolve();
  const db = {
    $transaction: (callback: (db: any) => Promise<any>) => {
      const execute = async () => {
        const draft = structuredClone(state);
        const tx = {
          $queryRaw: async (_sql: unknown, messageId: string, scope: string) => {
            expect(messageId).toBe("message"); expect(scope).toBe("client");
            return [];
          },
          message: {
            findFirst: async ({ where }: any) => where.clientId === draft.message.clientId ? draft.message : null,
            update: async ({ data }: any) => Object.assign(draft.message, data),
          },
          messageRouteAttempt: { findFirst: async () => ({ id: "old-attempt", status: attemptStatus }) },
          messageStatusEvent: { create: async ({ data }: any) => { const event = { id: "retry-event", ...data }; draft.events.push(event); return event; } },
          outboxEvent: { create: async ({ data }: any) => { if (failOutbox) throw new Error("Outbox unavailable"); draft.outbox.push(data); return { id: "outbox-1", ...data }; } },
        };
        const output = await callback(tx);
        state = draft;
        return output;
      };
      const operation = pending.then(execute);
      pending = operation.catch(() => {});
      return operation;
    },
  };
  return { repository: new MessageRepository(db as never), state: () => state };
}

const now = new Date("2026-10-19T12:00:00Z");
describe("manual message retry", () => {
  it("atomically queues the same message and records the old attempt as cycle boundary", async () => {
    const f = fixture();
    const output = await f.repository.retryFailedMessage("client", "message", "sms.queued", now);
    expect(output).toMatchObject({ messageId: "message", status: "QUEUED", manualRetryEventId: "retry-event", outboxEventId: "outbox-1" });
    expect(f.state().message.currentStatus).toBe("QUEUED");
    expect(f.state().events[0]).toMatchObject({ source: "manual-retry", status: "QUEUED", attemptId: "old-attempt" });
    expect(f.state().outbox[0]).toMatchObject({ queueName: "sms.queued", availableAt: now, payload: { messageId: "message", manualRetryEventId: "retry-event" } });
  });
  it("only accepts a failed message belonging to the requested client", async () => {
    for (const status of ["QUEUED", "ROUTED", "SUBMITTED", "DELIVERED", "EXPIRED"]) {
      await expect(fixture(status).repository.retryFailedMessage("client", "message", "sms.queued", now)).rejects.toMatchObject({ status: 409 });
    }
    await expect(fixture("FAILED", "other-client").repository.retryFailedMessage("client", "message", "sms.queued", now)).rejects.toMatchObject({ status: 404 });
    await expect(fixture("FAILED", "client", "UNKNOWN").repository.retryFailedMessage("client", "message", "sms.queued", now)).rejects.toMatchObject({ status: 409 });
  });
  it("concurrent requests produce one queued event", async () => {
    const f = fixture();
    const results = await Promise.allSettled([
      f.repository.retryFailedMessage("client", "message", "sms.queued", now),
      f.repository.retryFailedMessage("client", "message", "sms.queued", now),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(f.state().outbox).toHaveLength(1);
  });
  it("rolls back message state and audit history if scheduling fails", async () => {
    const f = fixture("FAILED", "client", "FAILED", true);
    await expect(f.repository.retryFailedMessage("client", "message", "sms.queued", now)).rejects.toThrow("Outbox unavailable");
    expect(f.state().message.currentStatus).toBe("FAILED");
    expect(f.state().events).toHaveLength(0);
  });
  it("requires message submission permission", () => {
    expect(Reflect.getMetadata(AUTHORIZE_METADATA, MessagesController.prototype.retry)).toEqual([Permissions.MESSAGES_CREATE]);
    expect(Reflect.getMetadata("__httpCode__", MessagesController.prototype.retry)).toBe(202);
  });
});

describe("manual retry logs", () => {
  it("logs correlation IDs only after scheduling succeeds", async () => {
    const logs: any[] = [];
    const context = {
      messages: { retryFailedMessage: async () => ({ messageId: "message", status: "QUEUED", manualRetryEventId: "event-1", outboxEventId: "outbox-1" }) },
      queueForStatus: () => "sms.queued", clock: { now: () => now },
      logger: { info: (fields: any) => logs.push(fields), warn: (fields: any) => logs.push(fields) },
    };
    expect(await MessageService.prototype.retry.call(context as never, "client", "message")).toEqual({ messageId: "message", status: "QUEUED" });
    expect(logs).toEqual([expect.objectContaining({ event: "message.manual_retry.queued", messageId: "message", manualRetryEventId: "event-1", outboxEventId: "outbox-1" })]);
    logs.length = 0;
    context.messages.retryFailedMessage = async () => { throw new Error("Cannot schedule"); };
    await expect(MessageService.prototype.retry.call(context as never, "client", "message")).rejects.toThrow("Cannot schedule");
    expect(logs.map(row => row.event)).toEqual(["message.manual_retry.rejected"]);
  });
});
