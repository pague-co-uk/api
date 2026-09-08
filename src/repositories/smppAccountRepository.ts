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
export class SmppAccountRepository
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
    return new SmppAccountRepository(
      db,
    ) as this;
  }

  async create(
    data: Prisma.SmppAccountCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "smpp_accounts",
      async () => {
        const result =
          await this.db.smppAccount.create({
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
    id: string,
  ) {
    return this.execute(
      "SELECT",
      "smpp_accounts",
      async () => {
        const result =
          await this.db.smppAccount.findUnique({
            where: {
              id,
            },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );
  }

  async findManyPlatform(
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly clientId?: string;
      readonly status?: Prisma.SmppAccountWhereInput["status"];
      readonly search?: string;
    },
  ) {
    return this.execute(
      "SELECT",
      "smpp_accounts",
      async () => {
        const skip =
          (options.page - 1) *
          options.pageSize;

        const search =
          options.search?.trim();

        const where: Prisma.SmppAccountWhereInput = {
          ...(options.clientId !==
            undefined
            ? {
              clientId:
                options.clientId,
            }
            : {}),

          ...(options.status !==
            undefined
            ? {
              status:
                options.status,
            }
            : {}),

          ...(search
            ? {
              OR: [
                {
                  systemId: {
                    contains:
                      search,
                  },
                },
                {
                  publicId: {
                    contains:
                      search,
                  },
                },
              ],
            }
            : {}),
        };

        const [
          items,
          totalItems,
        ] = await Promise.all([
          this.db.smppAccount.findMany({
            where,

            include: {
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },
            },

            orderBy: {
              createdAt: "desc",
            },

            take:
              options.pageSize,

            skip,
          }),

          this.db.smppAccount.count({
            where,
          }),
        ]);

        return {
          result: {
            items,
            page:
              options.page,
            pageSize:
              options.pageSize,
            totalItems,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  async findByPublicId(
    publicId: string,
  ) {
    return this.execute(
      "SELECT",
      "smpp_accounts",
      async () => {
        const result =
          await this.db.smppAccount.findUnique({
            where: {
              publicId,
            },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );
  }

  async findBySystemId(
    systemId: string,
  ) {
    return this.execute(
      "SELECT",
      "smpp_accounts",
      async () => {
        const result =
          await this.db.smppAccount.findUnique({
            where: {
              systemId,
            },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );
  }

  async findForAuthentication(
    systemId: string,
  ) {
    return this.execute(
      "SELECT",
      "smpp_accounts",
      async () => {
        const result =
          await this.db.smppAccount.findUnique({
            where: {
              systemId,
            },

            select: {
              id: true,
              clientId: true,
              systemId: true,
              passwordHash: true,
              status: true,
              maxConcurrentBinds: true,
              enquireLinkInterval: true,

              ipAllowlist: {
                select: {
                  ipAddress: true,
                },

                orderBy: {
                  createdAt: "asc",
                },
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

  async findByClient(
    clientId: string,
  ) {
    return this.execute(
      "SELECT",
      "smpp_accounts",
      async () => {
        const result =
          await this.db.smppAccount.findMany({
            where: {
              clientId,
            },
            orderBy: {
              createdAt: "desc",
            },
          });

        return {
          result,
          rowsAffected: result.length,
        };
      },
    );
  }

  async update(
    id: string,
    data: Prisma.SmppAccountUpdateInput,
  ) {
    return this.execute(
      "UPDATE",
      "smpp_accounts",
      async () => {
        const result =
          await this.db.smppAccount.update({
            where: {
              id,
            },
            data,
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  async updatePassword(
    id: string,
    passwordHash: string,
  ) {
    return this.execute(
      "UPDATE",
      "smpp_accounts",
      async () => {
        const result =
          await this.db.smppAccount.update({
            where: {
              id,
            },
            data: {
              passwordHash,
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  async updateStatus(
    id: string,
    status: Prisma.SmppAccountUpdateInput["status"],
  ) {
    return this.execute(
      "UPDATE",
      "smpp_accounts",
      async () => {
        const result =
          await this.db.smppAccount.update({
            where: {
              id,
            },
            data: {
              status,
            },
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
      "smpp_accounts",
      async () => {
        const result =
          await this.db.smppAccount.delete({
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