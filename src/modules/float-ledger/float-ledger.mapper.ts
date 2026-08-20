import { Injectable } from "@nestjs/common";

import type { FloatLedgerEntry } from "@prisma/client";

@Injectable()
export class FloatLedgerMapper {
  toResponse(
    entry: FloatLedgerEntry,
  ) {
    return {
      id: entry.id,
      publicId: entry.publicId,
      clientId: entry.clientId,
      createdById: entry.createdById,

      transactionType:
        entry.transactionType,

      credits: entry.credits,

      referenceType:
        entry.referenceType,

      referenceId:
        entry.referenceId,

      description:
        entry.description,

      createdAt:
        entry.createdAt,
    };
  }

  toResponses(
    entries: readonly FloatLedgerEntry[],
  ) {
    return entries.map(
      (entry) =>
        this.toResponse(entry),
    );
  }
}