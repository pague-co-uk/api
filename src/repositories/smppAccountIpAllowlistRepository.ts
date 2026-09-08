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
export class SmppAccountIpAllowlistRepository
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
    return new SmppAccountIpAllowlistRepository(
      db,
    ) as this;
  }

  async findById(
    id: string,
  ) {
    return this.execute(
      "SELECT",
      "smpp_account_ip_allowlist",
      async () => {
        const result =
          await this.db.smppAccountIpAllowlist.findUnique({
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

  async findByAccount(
    smppAccountId: string,
  ) {
    return this.execute(
      "SELECT",
      "smpp_account_ip_allowlist",
      async () => {
        const result =
          await this.db.smppAccountIpAllowlist.findMany({
            where: {
              smppAccountId,
            },

            orderBy: {
              createdAt: "asc",
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

  async findByAccountAndIp(
    smppAccountId: string,
    ipAddress: string,
  ) {
    return this.execute(
      "SELECT",
      "smpp_account_ip_allowlist",
      async () => {
        const result =
          await this.db.smppAccountIpAllowlist.findUnique({
            where: {
              smppAccountId_ipAddress: {
                smppAccountId,
                ipAddress,
              },
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

  async create(
    data: Prisma.SmppAccountIpAllowlistCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "smpp_account_ip_allowlist",
      async () => {
        const result =
          await this.db.smppAccountIpAllowlist.create({
            data,
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  async delete(
    id: string,
  ) {
    return this.execute(
      "DELETE",
      "smpp_account_ip_allowlist",
      async () => {
        const result =
          await this.db.smppAccountIpAllowlist.delete({
            where: {
              id,
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }
}