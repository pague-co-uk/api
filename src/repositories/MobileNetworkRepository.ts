import { Inject, Injectable } from "@nestjs/common";

import {
  MobileNetwork,
  MobileNetworkPrefix,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import type { Page } from "../common/query/page.interface.js";
import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";
import type { MobileNetworkQueryOptions } from "./options/mobile-network.options.js";

export type MobileNetworkWithPrefixes = Prisma.MobileNetworkGetPayload<{
  include: {
    prefixes: true;
  };
}>;

@Injectable()
export class MobileNetworkRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(db: Prisma.TransactionClient): this {
    return new MobileNetworkRepository(db) as this;
  }

  create(data: Prisma.MobileNetworkCreateInput): Promise<MobileNetwork> {
    return this.execute("INSERT", "mobile_networks", async () => ({
      result: await this.db.mobileNetwork.create({ data }),
      rowsAffected: 1,
    }));
  }

  findById(id: string): Promise<MobileNetworkWithPrefixes | null> {
    return this.execute("SELECT", "mobile_networks", async () => {
      const network = await this.db.mobileNetwork.findUnique({
        where: { id },
        include: { prefixes: true },
      });

      return {
        result: network,
        rowsAffected: network ? 1 : 0,
      };
    });
  }

  findByPublicId(publicId: string): Promise<MobileNetwork | null> {
    return this.execute("SELECT", "mobile_networks", async () => {
      const network = await this.db.mobileNetwork.findUnique({
        where: { publicId },
      });

      return {
        result: network,
        rowsAffected: network ? 1 : 0,
      };
    });
  }

  findByCode(code: string): Promise<MobileNetwork | null> {
    return this.execute("SELECT", "mobile_networks", async () => {
      const network = await this.db.mobileNetwork.findUnique({
        where: { code },
      });

      return {
        result: network,
        rowsAffected: network ? 1 : 0,
      };
    });
  }

  findMany(query: MobileNetworkQueryOptions): Promise<Page<MobileNetworkWithPrefixes>> {
    return this.execute("SELECT", "mobile_networks", async () => {
      const where: Prisma.MobileNetworkWhereInput = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.countryCode) {
        where.countryCode = query.countryCode;
      }

      if (query.search) {
        where.OR = [
          { name: { contains: query.search } },
          { code: { contains: query.search } },
          { publicId: { contains: query.search } },
        ];
      }

      const [items, totalItems] = await Promise.all([
        this.db.mobileNetwork.findMany({
          where,
          include: { prefixes: true },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy: [{ name: "asc" }, { code: "asc" }],
        }),
        this.db.mobileNetwork.count({ where }),
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

  update(id: string, data: Prisma.MobileNetworkUpdateInput): Promise<MobileNetworkWithPrefixes> {
    return this.execute("UPDATE", "mobile_networks", async () => ({
      result: await this.db.mobileNetwork.update({
        where: { id },
        data,
        include: { prefixes: true },
      }),
      rowsAffected: 1,
    }));
  }

  delete(id: string): Promise<MobileNetwork> {
    return this.execute("DELETE", "mobile_networks", async () => ({
      result: await this.db.mobileNetwork.delete({ where: { id } }),
      rowsAffected: 1,
    }));
  }

  findPrefixById(id: string): Promise<MobileNetworkPrefix | null> {
    return this.execute("SELECT", "mobile_network_prefixes", async () => {
      const prefix = await this.db.mobileNetworkPrefix.findUnique({ where: { id } });
      return { result: prefix, rowsAffected: prefix ? 1 : 0 };
    });
  }

  findPrefixByCountryCodeAndPrefix(countryCode: string, prefix: string): Promise<MobileNetworkPrefix | null> {
    return this.execute("SELECT", "mobile_network_prefixes", async () => {
      const entry = await this.db.mobileNetworkPrefix.findFirst({
        where: { countryCode, prefix },
      });

      return {
        result: entry,
        rowsAffected: entry ? 1 : 0,
      };
    });
  }

  findPrefixByNetworkAndPrefix(mobileNetworkId: string, prefix: string): Promise<MobileNetworkPrefix | null> {
    return this.execute("SELECT", "mobile_network_prefixes", async () => {
      const entry = await this.db.mobileNetworkPrefix.findFirst({
        where: { mobileNetworkId, prefix },
      });

      return {
        result: entry,
        rowsAffected: entry ? 1 : 0,
      };
    });
  }

  findPrefixesByNetwork(mobileNetworkId: string, query: { page: number; pageSize: number }): Promise<Page<MobileNetworkPrefix>> {
    return this.execute("SELECT", "mobile_network_prefixes", async () => {
      const where: Prisma.MobileNetworkPrefixWhereInput = { mobileNetworkId };
      const [items, totalItems] = await Promise.all([
        this.db.mobileNetworkPrefix.findMany({
          where,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy: [{ prefix: "asc" }],
        }),
        this.db.mobileNetworkPrefix.count({ where }),
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

  createPrefix(data: Prisma.MobileNetworkPrefixCreateInput): Promise<MobileNetworkPrefix> {
    return this.execute("INSERT", "mobile_network_prefixes", async () => ({
      result: await this.db.mobileNetworkPrefix.create({ data }),
      rowsAffected: 1,
    }));
  }

  updatePrefix(id: string, data: Prisma.MobileNetworkPrefixUpdateInput): Promise<MobileNetworkPrefix> {
    return this.execute("UPDATE", "mobile_network_prefixes", async () => ({
      result: await this.db.mobileNetworkPrefix.update({
        where: { id },
        data,
      }),
      rowsAffected: 1,
    }));
  }

  deletePrefix(id: string): Promise<MobileNetworkPrefix> {
    return this.execute("DELETE", "mobile_network_prefixes", async () => ({
      result: await this.db.mobileNetworkPrefix.delete({ where: { id } }),
      rowsAffected: 1,
    }));
  }
}
