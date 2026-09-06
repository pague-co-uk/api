import { Injectable } from "@nestjs/common";

import type {
  FloatLedgerEntry,
} from "@prisma/client";

export type FloatLedgerEntryWithOptionalClient =
  FloatLedgerEntry & {
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