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
  // Find by ID
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

  // -------------------------------------------------------------------------
  // Find many
  //
  // General audit-log search.
  //
  // Search is performed against the searchable audit fields and pagination
  // is performed in the database.
  // -------------------------------------------------------------------------

  async findMany(
    options?: {
      readonly search?: string;
      readonly clientId?: string;
      readonly userId?: string;
      readonly action?: string;
      readonly entityType?: string;
      readonly entityId?: string;
      readonly page?: number;
      readonly pageSize?: number;
    },
  ) {
    return this.execute(
      "SELECT",
      "audit_logs",
      async () => {
        const page = Math.max(
          options?.page ?? 1,
          1,
        );

        const pageSize = Math.min(
          Math.max(
            options?.pageSize ?? 20,
            1,
          ),
          100,
        );

        const search =
          options?.search?.trim() || undefined;

        const structuredWhere: Prisma.AuditLogWhereInput = {};

        if (options?.clientId) {
          structuredWhere.clientId = options.clientId;
        }

        if (options?.userId) {
          structuredWhere.userId = options.userId;
        }

        if (options?.action) {
          structuredWhere.action = options.action;
        }

        if (options?.entityType) {
          structuredWhere.entityType = options.entityType;
        }

        if (options?.entityId) {
          structuredWhere.entityId = options.entityId;
        }

        const skip =
          (page - 1) * pageSize;

        let where:
          | Prisma.AuditLogWhereInput
          | undefined;

        const searchClause = search
          ? {
            OR: [
              {
                action: { contains: search },
              },
              {
                entityType: { contains: search },
              },
              {
                entityId: { contains: search },
              },
              {
                userId: { contains: search },
              },
              {
                clientId: { contains: search },
              },
              {
                ipAddress: { contains: search },
              },
              {
                userAgent: { contains: search },
              },
            ],
          }
          : undefined;

        // Combine structured filters (AND) with search (OR) when both present.
        if (
          Object.keys(structuredWhere).length > 0 &&
          searchClause
        ) {
          where = {
            AND: [structuredWhere, searchClause],
          };
        } else if (Object.keys(structuredWhere).length > 0) {
          where = structuredWhere;
        } else {
          where = searchClause;
        }

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.auditLog.findMany({
            where,
            orderBy: {
              createdAt: "desc",
            },
            skip,
            take: pageSize,
          }),

          this.db.auditLog.count({
            where,
          }),
        ]);

        const totalPages =
          totalItems === 0
            ? 0
            : Math.ceil(
              totalItems / pageSize,
            );

        return {
          result: {
            items,
            page,
            pageSize,
            totalItems,
            totalPages,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Find by entity
  // -------------------------------------------------------------------------

  async findByEntity(
    entityType: string,
    entityId: string,
    options?: {
      readonly page?: number;
      readonly pageSize?: number;
    },
  ) {
    return this.execute(
      "SELECT",
      "audit_logs",
      async () => {
        const page =
          Math.max(
            options?.page ?? 1,
            1,
          );

        const pageSize =
          Math.min(
            Math.max(
              options?.pageSize ?? 20,
              1,
            ),
            100,
          );

        const skip =
          (page - 1) * pageSize;

        const where = {
          entityType,
          entityId,
        };

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.auditLog.findMany({
            where,
            orderBy: {
              createdAt: "desc",
            },
            skip,
            take: pageSize,
          }),

          this.db.auditLog.count({
            where,
          }),
        ]);

        const totalPages =
          totalItems === 0
            ? 0
            : Math.ceil(
              totalItems / pageSize,
            );

        return {
          result: {
            items,
            page,
            pageSize,
            totalItems,
            totalPages,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Find by client
  // -------------------------------------------------------------------------

  async findByClient(
    clientId: string,
    options?: {
      readonly page?: number;
      readonly pageSize?: number;
    },
  ) {
    return this.execute(
      "SELECT",
      "audit_logs",
      async () => {
        const page =
          Math.max(
            options?.page ?? 1,
            1,
          );

        const pageSize =
          Math.min(
            Math.max(
              options?.pageSize ?? 20,
              1,
            ),
            100,
          );

        const skip =
          (page - 1) * pageSize;

        const where = {
          clientId,
        };

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.auditLog.findMany({
            where,
            orderBy: {
              createdAt: "desc",
            },
            skip,
            take: pageSize,
          }),

          this.db.auditLog.count({
            where,
          }),
        ]);

        const totalPages =
          totalItems === 0
            ? 0
            : Math.ceil(
              totalItems / pageSize,
            );

        return {
          result: {
            items,
            page,
            pageSize,
            totalItems,
            totalPages,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Find by user
  // -------------------------------------------------------------------------

  async findByUser(
    userId: string,
    options?: {
      readonly page?: number;
      readonly pageSize?: number;
    },
  ) {
    return this.execute(
      "SELECT",
      "audit_logs",
      async () => {
        const page =
          Math.max(
            options?.page ?? 1,
            1,
          );

        const pageSize =
          Math.min(
            Math.max(
              options?.pageSize ?? 20,
              1,
            ),
            100,
          );

        const skip =
          (page - 1) * pageSize;

        const where = {
          userId,
        };

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.auditLog.findMany({
            where,
            orderBy: {
              createdAt: "desc",
            },
            skip,
            take: pageSize,
          }),

          this.db.auditLog.count({
            where,
          }),
        ]);

        const totalPages =
          totalItems === 0
            ? 0
            : Math.ceil(
              totalItems / pageSize,
            );

        return {
          result: {
            items,
            page,
            pageSize,
            totalItems,
            totalPages,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Find by action
  // -------------------------------------------------------------------------

  async findByAction(
    action: string,
    options?: {
      readonly page?: number;
      readonly pageSize?: number;
    },
  ) {
    return this.execute(
      "SELECT",
      "audit_logs",
      async () => {
        const page =
          Math.max(
            options?.page ?? 1,
            1,
          );

        const pageSize =
          Math.min(
            Math.max(
              options?.pageSize ?? 20,
              1,
            ),
            100,
          );

        const skip =
          (page - 1) * pageSize;

        const where = {
          action,
        };

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.auditLog.findMany({
            where,
            orderBy: {
              createdAt: "desc",
            },
            skip,
            take: pageSize,
          }),

          this.db.auditLog.count({
            where,
          }),
        ]);

        const totalPages =
          totalItems === 0
            ? 0
            : Math.ceil(
              totalItems / pageSize,
            );

        return {
          result: {
            items,
            page,
            pageSize,
            totalItems,
            totalPages,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }
}