import { Injectable } from "@nestjs/common";

import type {
  FloatLedgerEntry,
} from "@prisma/client";

export type FloatLedgerEntryWithOptionalClient =
  FloatLedgerEntry & {
    referenceLabel?: string | null;
    createdBy?: { firstName: string; lastName: string; username: string } | null;
    client?: {
      id: string;
      publicId: string;
      companyName: string;
      displayName: string;
    };
  };

@Injectable()
export class FloatLedgerMapper {
  toResponse(
    entry: FloatLedgerEntryWithOptionalClient,
  ) {
    return {
      id: entry.id,
      createdByName: entry.createdBy ? `${entry.createdBy.firstName} ${entry.createdBy.lastName}`.trim() || entry.createdBy.username : null,
      publicId: entry.publicId,

      ...(entry.client
        ? {
          client: {
            id: entry.client.id,
            publicId:
              entry.client.publicId,
            companyName:
              entry.client.companyName,
            displayName:
              entry.client.displayName,
          },
        }
        : {
          clientId:
            entry.clientId,
        }),

      createdById:
        entry.createdById,

      transactionType:
        entry.transactionType,

      credits:
        entry.credits,

      referenceType:
        entry.referenceType,

      referenceId:
        entry.referenceId,
      referenceLabel: entry.referenceLabel ?? (entry.referenceType === "MESSAGE" ? "Message unavailable" : entry.referenceId),

      description:
        entry.description,

      createdAt:
        entry.createdAt,
    };
  }

  toResponses(
    entries: readonly FloatLedgerEntryWithOptionalClient[],
  ) {
    return entries.map(
      (entry) =>
        this.toResponse(entry),
    );
  }
}