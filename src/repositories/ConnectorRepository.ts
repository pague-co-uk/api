import { Inject, Injectable } from "@nestjs/common";

import { Connector, Prisma, PrismaClient } from "@prisma/client";

import type { Page } from "../common/query/page.interface.js";
import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";
import type { ConnectorQueryOptions } from "./options/connector.options.js";

@Injectable()
export class ConnectorRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(db: Prisma.TransactionClient): this {
    return new ConnectorRepository(db) as this;
  }

  create(data: Prisma.ConnectorCreateInput): Promise<Connector> {
    return this.execute("INSERT", "connectors", async () => ({
      result: await this.db.connector.create({ data }),
      rowsAffected: 1,
    }));
  }

  findById(id: string): Promise<Connector | null> {
    return this.execute("SELECT", "connectors", async () => {
      const connector = await this.db.connector.findUnique({ where: { id } });
      return { result: connector, rowsAffected: connector ? 1 : 0 };
    });
  }

  findByPublicId(publicId: string): Promise<Connector | null> {
    return this.execute("SELECT", "connectors", async () => {
      const connector = await this.db.connector.findUnique({ where: { publicId } });
      return { result: connector, rowsAffected: connector ? 1 : 0 };
    });
  }

  findByCode(code: string): Promise<Connector | null> {
    return this.execute("SELECT", "connectors", async () => {
      const connector = await this.db.connector.findUnique({ where: { code } });
      return { result: connector, rowsAffected: connector ? 1 : 0 };
    });
  }

  findMany(query: ConnectorQueryOptions): Promise<Page<Connector>> {
    return this.execute("SELECT", "connectors", async () => {
      const where: Prisma.ConnectorWhereInput = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.transport) {
        where.transport = query.transport;
      }

      if (query.provider) {
        where.provider = { contains: query.provider };
      }

      if (query.search) {
        where.OR = [
          { name: { contains: query.search } },
          { code: { contains: query.search } },
          { publicId: { contains: query.search } },
          { provider: { contains: query.search } },
        ];
      }

      const [items, totalItems] = await Promise.all([
        this.db.connector.findMany({
          where,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy: [{ name: "asc" }, { code: "asc" }],
        }),
        this.db.connector.count({ where }),
      ]);

      return {
        result: {
          items,
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
        },
        rowsAffected: items.length,
      };
    });
  }

  update(id: string, data: Prisma.ConnectorUpdateInput): Promise<Connector> {
    return this.execute("UPDATE", "connectors", async () => ({
      result: await this.db.connector.update({ where: { id }, data }),
      rowsAffected: 1,
    }));
  }

  delete(id: string): Promise<Connector> {
    return this.execute("DELETE", "connectors", async () => ({
      result: await this.db.connector.delete({ where: { id } }),
      rowsAffected: 1,
    }));
  }
}
