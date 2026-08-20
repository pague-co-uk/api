import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  LedgerReferenceType,
  LedgerTransactionType,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class FloatLedgerRepository
  extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db:
      | PrismaClient
      | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new FloatLedgerRepository(
      db,
    ) as this;
  }

  async create(
    data: Prisma.FloatLedgerEntryCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.create({
            data,
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  async findById(
    clientId: string,
    id: string,
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.findFirst({
            where: {
              id,
              clientId,
            },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );
  }

  async findByPublicId(
    clientId: string,
    publicId: string,
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.findFirst({
            where: {
              publicId,
              clientId
            },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );
  }

  async findByClient(
    clientId: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
    },
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.findMany({
            where: {
              clientId,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: options?.limit,
            skip: options?.offset,
          });

        return {
          result,
          rowsAffected: result.length,
        };
      },
    );
  }

  async sumCreditsByClient(
    clientId: string,
  ): Promise<number> {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const aggregate =
          await this.db.floatLedgerEntry.aggregate({
            where: {
              clientId,
            },
            _sum: {
              credits: true,
            },
          });

        return {
          result:
            aggregate._sum.credits ?? 0,
          rowsAffected: 1,
        };
      },
    );
  }

  async countByClient(
    clientId: string,
  ): Promise<number> {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.count({
            where: {
              clientId,
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  async findByReference(
    clientId: string,
    referenceType: LedgerReferenceType,
    referenceId: string,
    transactionType: LedgerTransactionType,
  ) {
    return this.execute(
      "SELECT",
      "float_ledger_entries",
      async () => {
        const result =
          await this.db.floatLedgerEntry.findFirst({
            where: {
              clientId,
              referenceType,
              referenceId,
              transactionType,
            },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );
  }
}