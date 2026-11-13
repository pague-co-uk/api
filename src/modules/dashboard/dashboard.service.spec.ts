import { describe, expect, it } from "@jest/globals";
import { MessageStatus } from "@prisma/client";
import { DashboardService } from "./dashboard.service.js";

const service = Object.create(DashboardService.prototype) as DashboardService;
const rows = (counts: Partial<Record<MessageStatus, number>>) => Object.entries(counts).map(([currentStatus, count]) => ({ currentStatus: currentStatus as MessageStatus, _count: { _all: count! } }));

describe("dashboard delivery outcomes", () => {
  it("separates routing failures and submitted messages from completed delivery outcomes", () => {
    const summary = service["buildMessageSummary"](rows({ DELIVERED: 80, FAILED: 30, EXPIRED: 10, SUBMITTED: 50, QUEUED: 5, ROUTED: 5 }), 20);
    expect(summary).toMatchObject({ total: 180, delivered: 80, failed: 10, routingFailures: 20, submitted: 50, deliveryRate: 80 });
  });

  it("has no successful outcomes when there are only routing failures or pending receipts", () => {
    const summary = service["buildMessageSummary"](rows({ FAILED: 20, SUBMITTED: 10 }), 20);
    expect(summary.deliveryRate).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.routingFailures).toBe(20);
  });

  it("returns zero for an empty period", () => {
    expect(service["buildMessageSummary"]([], 0)).toMatchObject({ total: 0, deliveryRate: 0, failed: 0, submitted: 0, routingFailures: 0 });
  });

  it("uses the same completed-outcome denominator for client comparisons", () => {
    const messageRows = rows({ DELIVERED: 80, FAILED: 30, EXPIRED: 10, SUBMITTED: 50 }).map(row => ({ ...row, clientId: "client", routingFailures: row.currentStatus === "FAILED" ? 20 : 0 }));
    const clients = service["buildClientSummaries"](messageRows, [{ id: "client", publicId: "ACME", displayName: "Acme", companyName: "Acme Ltd", status: "ACTIVE" }]);
    expect(clients[0]).toMatchObject({ messages: 170, delivered: 80, failed: 10, deliveryRate: 80 });
  });
});
