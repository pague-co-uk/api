import { describe, expect, it, jest } from "@jest/globals";
import type { PrismaClient } from "@prisma/client";
import { ledgerReferenceLabels } from "./ledger-reference-labels.js";

describe("ledger display references", () => {
  it("resolves message references in their client's scope while retaining original reference IDs", async () => {
    const findMany = jest.fn(async () => [{ id: "message-a", clientId: "client-a", publicId: "MSG-ACME" }]);
    const db = { message: { findMany } } as unknown as PrismaClient;
    const result = await ledgerReferenceLabels(db, [
      { clientId: "client-a", referenceType: "MESSAGE", referenceId: "message-a" },
      { clientId: "client-b", referenceType: "MESSAGE", referenceId: "missing" },
      { clientId: "client-a", referenceType: "ADMIN", referenceId: "BANK-REFERENCE" },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { OR: [{ id: "message-a", clientId: "client-a" }, { id: "missing", clientId: "client-b" }] },
      select: { id: true, clientId: true, publicId: true },
    });
    expect(result.map(row => row.referenceLabel)).toEqual(["MSG-ACME", "Message unavailable", "BANK-REFERENCE"]);
    expect(result[0].referenceId).toBe("message-a");
  });

  it("does not issue a message lookup for external or empty references", async () => {
    const findMany = jest.fn();
    const result = await ledgerReferenceLabels({ message: { findMany } } as unknown as PrismaClient, [{ clientId: "client-a", referenceType: "ADMIN", referenceId: null }]);
    expect(findMany).not.toHaveBeenCalled();
    expect(result[0].referenceLabel).toBeNull();
  });
});
