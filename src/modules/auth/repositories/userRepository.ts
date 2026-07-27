import { Inject, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";

@Injectable()
export class UserRepository extends DatabaseRepository {
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
    return new UserRepository(
      db,
    ) as this;
  }

  async findById(id: string) {
    return this.execute(
      "SELECT",
      "users",
      async () => {
        const user = await this.db.user.findUnique({
          where: { id },
        });

        return {
          result: user,
          rowsAffected: user ? 1 : 0,
        };
      },
    );
  }

  async findByUsername(username: string) {
    return this.execute(
      "SELECT",
      "users",
      async () => {
        const user = await this.db.user.findUnique({
          where: { username },
        });

        return {
          result: user,
          rowsAffected: user ? 1 : 0,
        };
      },
    );
  }

  async findByEmail(
    clientId: string,
    email: string,
  ) {
    return this.execute(
      "SELECT",
      "users",
      async () => {
        const user = await this.db.user.findUnique({
          where: {
            clientId_email: {
              clientId,
              email,
            },
          },
        });

        return {
          result: user,
          rowsAffected: user ? 1 : 0,
        };
      },
    );
  }

  async recordFailedLogin(
    id: string,
    failedLoginAttempts: number,
    lockedUntil: Date | null,
  ) {
    return this.execute(
      "UPDATE",
      "users",
      async () => ({
        result: await this.db.user.update({
          where: { id },
          data: {
            failedLoginAttempts,
            lockedUntil,
          },
        }),
        rowsAffected: 1,
      }),
    );
  }

  async recordSuccessfulLogin(
    id: string,
    lastLoginAt: Date,
  ) {
    return this.execute(
      "UPDATE",
      "users",
      async () => ({
        result: await this.db.user.update({
          where: { id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt,
          },
        }),
        rowsAffected: 1,
      }),
    );
  }

  async clearLoginLock(id: string) {
    return this.execute(
      "UPDATE",
      "users",
      async () => ({
        result: await this.db.user.update({
          where: { id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        }),
        rowsAffected: 1,
      }),
    );
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
  ) {
    return this.execute(
      "UPDATE",
      "users",
      async () => ({
        result: await this.db.user.update({
          where: { id },
          data,
        }),
        rowsAffected: 1,
      }),
    );
  }

  async create(
    data: Prisma.UserCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "users",
      async () => ({
        result: await this.db.user.create({
          data,
        }),
        rowsAffected: 1,
      }),
    );
  }

  async existsByUsername(
    username: string,
  ): Promise<boolean> {
    const user =
      await this.db.user.findUnique({
        where: {
          username,
        },
        select: {
          id: true,
        },
      });

    return user !== null;
  }

  async existsByEmail(
    email: string,
  ): Promise<boolean> {
    const user =
      await this.db.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      });

    return user !== null;
  }
}