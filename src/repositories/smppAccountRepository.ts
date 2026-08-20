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