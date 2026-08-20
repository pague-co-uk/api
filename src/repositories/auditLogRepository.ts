import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class AuditLogRepository
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
    return new AuditLogRepository(
      db,
    ) as this;
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(
    data: Prisma.AuditLogCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "audit_logs",
      async () => {
        const result =
          await this.db.auditLog.create({
            data,
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(
    id: string,
  ) {
    return this.execute(
      "SELECT",
      "audit_logs",
      async () => {
        const result =
          await this.db.auditLog.findUnique({
            where: {
              id,
            },
          });

        return {
          result,
          rowsAffected:
            result ? 1 : 0,
        };
      },
    );
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ) {
    return this.execute(
      "SELECT",
      "audit_logs",
      async () => {
        const result =
          await this.db.auditLog.findMany({
            where: {
              entityType,
              entityId,
            },
            orderBy: {
              createdAt: "desc",
            },
          });

        return {
          result,
          rowsAffected:
            result.length,
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
      "audit_logs",
      async () => {
        const result =
          await this.db.auditLog.findMany({
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
          rowsAffected:
            result.length,
        };
      },
    );
  }

  async findByUser(
    userId: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
    },
  ) {
    return this.execute(
      "SELECT",
      "audit_logs",
      async () => {
        const result =
          await this.db.auditLog.findMany({
            where: {
              userId,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: options?.limit,
            skip: options?.offset,
          });

        return {
          result,
          rowsAffected:
            result.length,
        };
      },
    );
  }

  async findByAction(
    action: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
    },
  ) {
    return this.execute(
      "SELECT",
      "audit_logs",
      async () => {
        const result =
          await this.db.auditLog.findMany({
            where: {
              action,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: options?.limit,
            skip: options?.offset,
          });

        return {
          result,
          rowsAffected:
            result.length,
        };
      },
    );
  }
}