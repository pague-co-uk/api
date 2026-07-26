import {
  DatabaseLifecycle,
  DatabaseOperation,
  getDatabaseLifecycle,
} from "@pague-co-uk/sms-gateway-telemetry";
import { Prisma, PrismaClient } from "@prisma/client";

export interface DatabaseOperationResult<TResult> {
  result: TResult;
  rowsAffected?: number;
}

export abstract class DatabaseRepository {
  protected readonly lifecycle: DatabaseLifecycle;

  protected constructor(
    public readonly db:
      | PrismaClient
      | Prisma.TransactionClient,
  ) {
    this.lifecycle = getDatabaseLifecycle();
  }

  protected execute<TResult>(
    operation: DatabaseOperation,
    table: string,
    query: () => Promise<DatabaseOperationResult<TResult>>,
  ): Promise<TResult> {
    return this.lifecycle.execute(
      {
        system: "mysql",
        operation,
        table,
      },
      query,
    );
  }

  public withTransaction<TResult>(
    callback: (repository: this) => Promise<TResult>,
  ): Promise<TResult> {
    if ("$transaction" in this.db) {
      return this.db.$transaction(async (tx) => {
        return callback(
          this.withDatabase(tx),
        );
      });
    }

    return callback(this);
  }

  protected abstract withDatabase(
    db: Prisma.TransactionClient,
  ): this;
}