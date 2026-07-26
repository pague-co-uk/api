import { Inject, Injectable } from "@nestjs/common";
import {
  AuthenticationEvent,
  AuthenticationEventType,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";

@Injectable()
export class AuthenticationEventRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db:
      | PrismaClient
      | Prisma.TransactionClient,
  ) {
    super(db);
  }

  protected withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new AuthenticationEventRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.AuthenticationEventCreateInput,
  ): Promise<AuthenticationEvent> {
    return this.execute(
      "INSERT",
      "authentication_events",
      async () => ({
        result:
          await this.db.authenticationEvent.create({
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  findById(
    id: string,
  ): Promise<AuthenticationEvent | null> {
    return this.execute(
      "SELECT",
      "authentication_events",
      async () => {
        const event =
          await this.db.authenticationEvent.findUnique({
            where: { id },
          });

        return {
          result: event,
          rowsAffected: event ? 1 : 0,
        };
      },
    );
  }

  findByUser(
    userId: string,
    options?: {
      skip?: number;
      take?: number;
    },
  ): Promise<AuthenticationEvent[]> {
    const {
      skip = 0,
      take = 50,
    } = options ?? {};

    return this.execute(
      "SELECT",
      "authentication_events",
      async () => {
        const events =
          await this.db.authenticationEvent.findMany({
            where: {
              userId,
            },
            orderBy: {
              createdAt: "desc",
            },
            skip,
            take,
          });

        return {
          result: events,
          rowsAffected: events.length,
        };
      },
    );
  }

  findByClient(
    clientId: string,
    options?: {
      skip?: number;
      take?: number;
    },
  ): Promise<AuthenticationEvent[]> {
    const {
      skip = 0,
      take = 100,
    } = options ?? {};

    return this.execute(
      "SELECT",
      "authentication_events",
      async () => {
        const events =
          await this.db.authenticationEvent.findMany({
            where: {
              clientId,
            },
            orderBy: {
              createdAt: "desc",
            },
            skip,
            take,
          });

        return {
          result: events,
          rowsAffected: events.length,
        };
      },
    );
  }

  findByType(
    type: AuthenticationEventType,
    options?: {
      skip?: number;
      take?: number;
    },
  ): Promise<AuthenticationEvent[]> {
    const {
      skip = 0,
      take = 100,
    } = options ?? {};

    return this.execute(
      "SELECT",
      "authentication_events",
      async () => {
        const events =
          await this.db.authenticationEvent.findMany({
            where: {
              type,
            },
            orderBy: {
              createdAt: "desc",
            },
            skip,
            take,
          });

        return {
          result: events,
          rowsAffected: events.length,
        };
      },
    );
  }

  deleteOlderThan(
    date: Date,
  ): Promise<Prisma.BatchPayload> {
    return this.execute(
      "DELETE",
      "authentication_events",
      async () => {
        const result =
          await this.db.authenticationEvent.deleteMany({
            where: {
              createdAt: {
                lt: date,
              },
            },
          });

        return {
          result,
          rowsAffected: result.count,
        };
      },
    );
  }
}