import { describe, expect, it } from "@jest/globals";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { MessageRepository } from "../../repositories/messageRepository.js";
import { MessageMapper } from "./message.mapper.js";
import { messageDateRange } from "./dto/message-date-range.js";
import { FindMessagesDto } from "./dto/find-messages.dto.js";
import { MessagesController } from "./controllers/messages.controller.js";
import { PlatformMessagesController } from "./controllers/platform-messages.controller.js";

// Exercise query construction without invoking external telemetry exporters.
class QueryTestRepository extends MessageRepository {
  protected async execute<T>(_operation: any, _table: string, query: () => Promise<{ result: T; rowsAffected?: number }>): Promise<T> {
    return (await query()).result;
  }
}

const scheduledAt = new Date("2026-10-19T10:00:00Z");
function message() {
  return {
    id: "message", publicId: "MSG-1", clientId: "client", currentStatus: "ROUTED",
    client: { id: "client", publicId: "CL-1", companyName: "Client", displayName: "Client" },
    senderId: null, _count: { routeAttempts: 5 },
    routeAttempts: [{ routeId: "route-b", status: "PENDING", scheduledAt }],
  };
}

describe("message retrieval with retries", () => {
  for (const platform of [false, true]) {
    it(`keeps pagination message-based and batches retry progress (${platform ? "platform" : "client"})`, async () => {
      const listQueries: any[] = [], countQueries: any[] = [], groups: any[] = [];
      const rows = [message(), { ...message(), id: "message-2" }];
      const db = {
        message: {
          count: async (args: unknown) => { countQueries.push(args); return 12; },
          findMany: async (args: unknown) => { listQueries.push(args); return rows; },
        },
        messageRouteAttempt: { groupBy: async (args: unknown) => {
          groups.push(args);
          return rows.map(row => ({ messageId: row.id, routeId: "route-b", _count: { _all: 2 } }));
        } },
      };
      const repository = new QueryTestRepository(db as never);
      const range = messageDateRange({ createdFrom: "2026-10-19", createdTo: "2026-10-19" });
      const options = { page: 2, pageSize: 10, status: "ROUTED" as const, clientId: "client", ...range };
      const page = platform ? await repository.findManyPlatform(options) : await repository.findByClient("client", options);
      expect(page.totalItems).toBe(12);
      expect(listQueries[0].skip).toBe(10);
      expect(listQueries[0].take).toBe(10);
      expect(listQueries[0].where).toEqual(countQueries[0].where);
      expect(listQueries[0].where.clientId).toBe("client");
      expect(listQueries[0].where.createdAt).toEqual({ gte: range.createdFrom, lt: range.createdTo });
      expect(listQueries[0].include.routeAttempts.take).toBe(1);
      expect(groups).toHaveLength(1);
      expect(groups[0].where.OR).toHaveLength(2);
      const mapped = new MessageMapper().toResponses(page.items);
      expect(mapped[0].routeAttempts).toEqual([]);
      expect(mapped[0].retryProgress).toEqual({ attemptCount: 5, routeSubmissionCount: 2, latestAttemptStatus: "PENDING", scheduledAt });
    });
  }

  it("empty pages do not query attempt history", async () => {
    const repository = new QueryTestRepository({ message: { count: async () => 0, findMany: async () => [] } } as never);
    expect((await repository.findByClient("client")).items).toEqual([]);
  });

  it("detail mapping distinguishes retries from route failover", () => {
    const attempt = (id: string, routeId: string, attemptNumber: number) => ({
      id, routeId, attemptNumber, scheduledAt, status: "FAILED", priority: 1,
      route: { id: routeId, publicId: routeId, mobileNetwork: { id: "network", name: "Network" }, connectorId: "connector", status: "ACTIVE" },
      connector: { id: "connector", publicId: "CON-1" }, messageStatusEvents: [],
    });
    const row = { ...message(), statusEvents: [], routeAttempts: [attempt("1", "a", 1), attempt("2", "a", 2), attempt("3", "b", 3)] };
    const output = new MessageMapper().toDetailsResponse(row as never);
    expect(output.routeAttempts.map(row => row.routeSubmissionNumber)).toEqual([1, 2, 1]);
    expect(output.routeAttempts.map(row => row.id)).toEqual(["1", "2", "3"]);
    expect(output.retryProgress.routeSubmissionCount).toBe(1);
    expect(output.routeAttempts[1].scheduledAt).toEqual(scheduledAt);
  });

  it("both controllers pass creation dates while preserving client scope", async () => {
    const calls: unknown[] = [];
    const service = {
      findByClient: async (...args: unknown[]) => { calls.push(args); return { items: [], page: 1, pageSize: 20, totalItems: 0 }; },
      findManyPlatform: async (...args: unknown[]) => { calls.push(args); return { items: [], page: 1, pageSize: 20, totalItems: 0 }; },
    };
    const dto = { createdFrom: "2026-10-19", createdTo: "2026-10-19", pageSize: 20 };
    await new MessagesController(service as never, new MessageMapper()).findMany("client", dto);
    await new PlatformMessagesController(service as never, new MessageMapper()).findMany(dto);
    expect(calls[0]).toEqual(["client", expect.objectContaining(messageDateRange(dto))]);
    expect(calls[1]).toEqual([expect.objectContaining(messageDateRange(dto))]);
  });
});

describe("date and page-size validation", () => {
  it("includes the entire end day in Africa/Nairobi time", () => {
    expect(messageDateRange({ createdFrom: "2026-10-19", createdTo: "2026-10-19" })).toEqual({
      createdFrom: new Date("2026-10-18T21:00:00Z"), createdTo: new Date("2026-10-19T21:00:00Z"),
    });
    expect(messageDateRange({ createdTo: "2026-12-31" }).createdTo).toEqual(new Date("2026-12-31T21:00:00Z"));
  });
  it("rejects reversed, impossible and ambiguous dates", () => {
    for (const input of [{ createdFrom: "2026-10-20", createdTo: "2026-10-19" }, { createdFrom: "2026-02-30" }, { createdFrom: "invalid" }, { createdFrom: "2026-10-19T10:00:00" }]) {
      expect(() => messageDateRange(input)).toThrow();
    }
  });
  it("preserves explicit timestamp boundaries", () => {
    expect(messageDateRange({ createdTo: "2026-10-19T12:00:00Z" }).createdTo).toEqual(new Date("2026-10-19T12:00:00Z"));
  });
  it("validates page sizes from query strings", async () => {
    for (const size of ["1", "20", "100"]) {
      expect(await validate(plainToInstance(FindMessagesDto, { pageSize: size }, { enableImplicitConversion: true }))).toHaveLength(0);
    }
    for (const size of ["0", "101", "1.5", "invalid"]) {
      expect((await validate(plainToInstance(FindMessagesDto, { pageSize: size }, { enableImplicitConversion: true }))).length).toBeGreaterThan(0);
    }
  });
});
