import { Inject, Injectable } from "@nestjs/common";

import { Prisma, PrismaClient, Route } from "@prisma/client";

import type { Page } from "../common/query/page.interface.js";
import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";
import type { RouteQueryOptions } from "./options/route.options.js";

export type RouteWithRelations = Prisma.RouteGetPayload<{
  include: {
    client: {
      select: {
        id: true;
        companyName: true;
        displayName: true;
      };
    };
    mobileNetwork: true;
    connector: true;
  };
}>;

@Injectable()
export class RouteRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(db: Prisma.TransactionClient): this {
    return new RouteRepository(db) as this;
  }

  create(data: Prisma.RouteCreateInput): Promise<RouteWithRelations> {
    return this.execute("INSERT", "routes", async () => ({
      result: await this.db.route.create({
        data,
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              displayName: true,
            },
          },
          mobileNetwork: true,
          connector: true,
        },
      }),
      rowsAffected: 1,
    }));
  }

  findById(id: string): Promise<RouteWithRelations | null> {
    return this.execute("SELECT", "routes", async () => {
      const route = await this.db.route.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              displayName: true,
            },
          },
          mobileNetwork: true,
          connector: true,
        },
      });

      return { result: route, rowsAffected: route ? 1 : 0 };
    });
  }

  findByPublicId(publicId: string): Promise<Route | null> {
    return this.execute("SELECT", "routes", async () => {
      const route = await this.db.route.findUnique({ where: { publicId } });
      return { result: route, rowsAffected: route ? 1 : 0 };
    });
  }

  findByClientAndNetworkAndPriority(clientId: string, mobileNetworkId: string, priority: number): Promise<Route | null> {
    return this.execute("SELECT", "routes", async () => {
      const route = await this.db.route.findUnique({
        where: {
          clientId_mobileNetworkId_priority: {
            clientId,
            mobileNetworkId,
            priority,
          },
        },
      });

      return { result: route, rowsAffected: route ? 1 : 0 };
    });
  }

  findMany(query: RouteQueryOptions): Promise<Page<RouteWithRelations>> {
    return this.execute("SELECT", "routes", async () => {
      const where: Prisma.RouteWhereInput = {};

      if (query.clientId) where.clientId = query.clientId;
      if (query.mobileNetworkId) where.mobileNetworkId = query.mobileNetworkId;
      if (query.connectorId) where.connectorId = query.connectorId;
      if (query.status) where.status = query.status;

      if (query.search) {
        where.OR = [
          { publicId: { contains: query.search } },
          { mobileNetwork: { name: { contains: query.search } } },
          { connector: { name: { contains: query.search } } },
        ];
      }

      const [items, totalItems] = await Promise.all([
        this.db.route.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                companyName: true,
                displayName: true,
              },
            },
            mobileNetwork: true,
            connector: true,
          },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        }),
        this.db.route.count({ where }),
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

  update(id: string, data: Prisma.RouteUpdateInput): Promise<RouteWithRelations> {
    return this.execute("UPDATE", "routes", async () => ({
      result: await this.db.route.update({
        where: { id },
        data,
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              displayName: true,
            },
          },
          mobileNetwork: true,
          connector: true,
        },
      }),
      rowsAffected: 1,
    }));
  }

  delete(id: string): Promise<Route> {
    return this.execute("DELETE", "routes", async () => ({
      result: await this.db.route.delete({ where: { id } }),
      rowsAffected: 1,
    }));
  }
}
