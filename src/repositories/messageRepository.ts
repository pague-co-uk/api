import { ConflictException, NotFoundException } from "@nestjs/common";
import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  MessageEncoding,
  MessageStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { Page } from "../common/query/page.interface.js";
import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";
import { MessageWithRelations } from "../modules/messages/message.mapper.js";

@Injectable()
export class MessageRepository
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
    return new MessageRepository(
      db,
    ) as this;
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  /**
   * Creates a single message.
   *
   * This remains available for callers that genuinely
   * need to create one message.
   */
  async create(
    data: Prisma.MessageCreateInput,
  ): Promise<MessageWithRelations> {
    return this.execute(
      "INSERT",
      "messages",
      async () => {
        const result =
          await this.db.message.create({
            data,

            include: {
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },

              senderId: {
                select: {
                  id: true,
                  publicId: true,
                  sender: true,
                },
              },
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  /**
   * Creates multiple messages in a single database operation.
   *
   * IDs must be supplied by the caller.
   *
   * This is intentionally a createMany() rather than
   * repeatedly calling create(), avoiding an N-query
   * pattern for batch submissions.
   */
  async createManyAndReturn(
    data: readonly Prisma.MessageCreateManyInput[],
    publicIds: readonly string[],
  ): Promise<MessageWithRelations[]> {
    return this.execute(
      "INSERT",
      "messages",
      async () => {
        if (data.length === 0) {
          return {
            result: [],
            rowsAffected: 0,
          };
        }

        if (
          data.length !==
          publicIds.length
        ) {
          throw new Error(
            "Message data and public IDs must have the same length.",
          );
        }

        await this.db.message.createMany({
          data: [...data],
        });

        const result =
          await this.db.message.findMany({
            where: {
              publicId: {
                in: [...publicIds],
              },
            },

            include: {
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },

              senderId: {
                select: {
                  id: true,
                  publicId: true,
                  sender: true,
                },
              },
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

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  /**
   * Retrieves a lightweight message by internal ID.
   *
   * Routing attempts and status history are intentionally excluded because
   * this method is also used by message status processing.
   */
  async findById(
    id: string,
  ) {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const result =
          await this.db.message.findUnique({
            where: {
              id,
            },

            include: {
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },

              senderId: {
                select: {
                  id: true,
                  publicId: true,
                  sender: true,
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

  /**
   * Retrieves a lightweight message by public ID.
   *
   * Routing attempts and status history are intentionally excluded.
   */
  async findByPublicId(
    publicId: string,
  ) {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const result =
          await this.db.message.findUnique({
            where: {
              publicId,
            },

            include: {
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },

              senderId: {
                select: {
                  id: true,
                  publicId: true,
                  sender: true,
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

  /**
   * Retrieves the complete message details by internal ID.
   *
   * Includes:
   *
   *   - client
   *   - sender ID
   *   - overall message status events
   *   - routing attempts
   *   - route
   *   - connector
   *   - attempt-specific status events
   */
  async findDetailsById(
    id: string,
  ) {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const result =
          await this.db.message.findUnique({
            where: {
              id,
            },

            include: {
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },

              senderId: {
                select: {
                  id: true,
                  publicId: true,
                  sender: true,
                },
              },

              statusEvents: {
                orderBy: {
                  createdAt: "asc",
                },
              },

              routeAttempts: {
                orderBy: {
                  attemptNumber: "asc",
                },

                include: {
                  route: {
                    include: {
                      mobileNetwork: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },

                  connector: true,

                  messageStatusEvents: {
                    orderBy: {
                      createdAt: "asc",
                    },
                  },
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

  /**
   * Retrieves the complete message details by public ID.
   */
  async findDetailsByPublicId(
    publicId: string,
  ) {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const result =
          await this.db.message.findUnique({
            where: {
              publicId,
            },

            include: {
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },

              senderId: {
                select: {
                  id: true,
                  publicId: true,
                  sender: true,
                },
              },

              statusEvents: {
                orderBy: {
                  createdAt: "asc",
                },
              },

              routeAttempts: {
                orderBy: {
                  attemptNumber: "asc",
                },

                include: {
                  route: {
                    include: {
                      mobileNetwork: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },

                  connector: true,

                  messageStatusEvents: {
                    orderBy: {
                      createdAt: "asc",
                    },
                  },
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

  async findManyPlatform(
    options?: {
      page?: number;
      pageSize?: number;
      clientId?: string;
      search?: string;
      destination?: string;
      senderIdId?: string;
      status?: MessageStatus;
      encoding?: MessageEncoding;
      createdFrom?: Date;
      createdTo?: Date;
      submittedFrom?: Date;
      submittedTo?: Date;
    },
  ): Promise<
    Page<MessageWithRelations>
  > {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const page =
          options?.page ?? 1;

        const pageSize =
          options?.pageSize ?? 25;

        const search =
          options?.search?.trim();

        const where: Prisma.MessageWhereInput = {
          ...(options?.createdFrom || options?.createdTo ? {
            createdAt: { gte: options.createdFrom, lt: options.createdTo },
          } : {}),
          ...(options?.clientId
            ? {
              clientId:
                options.clientId,
            }
            : {}),

          ...(search
            ? {
              OR: [
                {
                  publicId: {
                    contains: search,
                  },
                },
                {
                  destination: {
                    contains: search,
                  },
                },
                {
                  body: {
                    contains: search,
                  },
                },
              ],
            }
            : {}),

          ...(options?.destination
            ? {
              destination: {
                contains:
                  options.destination.trim(),
              },
            }
            : {}),

          ...(options?.senderIdId
            ? {
              senderIdId:
                options.senderIdId,
            }
            : {}),

          ...(options?.status !== undefined
            ? {
              currentStatus:
                options.status,
            }
            : {}),

          ...(options?.encoding !== undefined
            ? {
              encoding:
                options.encoding,
            }
            : {}),

          ...(options?.submittedFrom ||
            options?.submittedTo
            ? {
              submittedAt: {
                ...(options.submittedFrom
                  ? {
                    gte:
                      options.submittedFrom,
                  }
                  : {}),

                ...(options.submittedTo
                  ? {
                    lte:
                      options.submittedTo,
                  }
                  : {}),
              },
            }
            : {}),
        };

        const skip =
          (page - 1) * pageSize;

        const [
          totalItems,
          items,
        ] = await Promise.all([
          this.db.message.count({
            where,
          }),

          this.db.message.findMany({
            where,

            include: {
              _count: { select: { routeAttempts: true } },
              routeAttempts: {
                orderBy: { attemptNumber: "desc" }, take: 1,
                select: { routeId: true, status: true, scheduledAt: true },
              },
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },

              senderId: {
                select: {
                  id: true,
                  publicId: true,
                  sender: true,
                },
              },
            },

            orderBy: [{ createdAt: "desc" }, { id: "desc" }],

            skip,
            take: pageSize,
          }),
        ]);

        return {
          result: {
            items: await this.attachRetryProgress(items),
            page,
            pageSize,
            totalItems,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  async findByClient(
    clientId: string,
    options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      destination?: string;
      senderIdId?: string;
      status?: MessageStatus;
      encoding?: MessageEncoding;
      createdFrom?: Date;
      createdTo?: Date;
      submittedFrom?: Date;
      submittedTo?: Date;
    },
  ): Promise<Page<MessageWithRelations>> {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const page =
          options?.page ?? 1;

        const pageSize =
          options?.pageSize ?? 25;

        const search =
          options?.search?.trim();

        const where: Prisma.MessageWhereInput = {
          ...(options?.createdFrom || options?.createdTo ? {
            createdAt: { gte: options.createdFrom, lt: options.createdTo },
          } : {}),
          clientId,

          ...(search
            ? {
              OR: [
                {
                  publicId: {
                    contains: search,
                  },
                },
                {
                  destination: {
                    contains: search,
                  },
                },
                {
                  body: {
                    contains: search,
                  },
                },
              ],
            }
            : {}),

          ...(options?.destination
            ? {
              destination: {
                contains:
                  options.destination.trim(),
              },
            }
            : {}),

          ...(options?.senderIdId
            ? {
              senderIdId:
                options.senderIdId,
            }
            : {}),

          ...(options?.status !== undefined
            ? {
              currentStatus:
                options.status,
            }
            : {}),

          ...(options?.encoding !== undefined
            ? {
              encoding:
                options.encoding,
            }
            : {}),

          ...(options?.submittedFrom ||
            options?.submittedTo
            ? {
              submittedAt: {
                ...(options.submittedFrom
                  ? {
                    gte:
                      options.submittedFrom,
                  }
                  : {}),

                ...(options.submittedTo
                  ? {
                    lte:
                      options.submittedTo,
                  }
                  : {}),
              },
            }
            : {}),
        };

        const skip =
          (page - 1) * pageSize;

        const [
          totalItems,
          items,
        ] = await Promise.all([
          this.db.message.count({
            where,
          }),

          this.db.message.findMany({
            where,

            include: {
              _count: { select: { routeAttempts: true } },
              routeAttempts: {
                orderBy: { attemptNumber: "desc" }, take: 1,
                select: { routeId: true, status: true, scheduledAt: true },
              },
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },

              senderId: {
                select: {
                  id: true,
                  publicId: true,
                  sender: true,
                },
              },
            },

            orderBy: [{ createdAt: "desc" }, { id: "desc" }],

            skip,
            take: pageSize,
          }),
        ]);

        return {
          result: {
            items: await this.attachRetryProgress(items),
            page,
            pageSize,
            totalItems,
          },

          rowsAffected:
            items.length,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  async updateStatus(
    id: string,
    status: MessageStatus,
  ): Promise<MessageWithRelations> {
    return this.execute(
      "UPDATE",
      "messages",
      async () => {
        const result =
          await this.db.message.update({
            where: {
              id,
            },

            data: {
              currentStatus:
                status,
            },

            include: {
              client: {
                select: {
                  id: true,
                  publicId: true,
                  companyName: true,
                  displayName: true,
                },
              },

              senderId: {
                select: {
                  id: true,
                  publicId: true,
                  sender: true,
                },
              },
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Counts
  // -------------------------------------------------------------------------

  async countByClient(
    clientId: string,
    status?: MessageStatus,
  ): Promise<number> {
    return this.execute(
      "SELECT",
      "messages",
      async () => {
        const result =
          await this.db.message.count({
            where: {
              clientId,

              ...(status !== undefined
                ? {
                  currentStatus:
                    status,
                }
                : {}),
            },
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }
  async retryFailedMessage(clientId: string, messageId: string, queueName: string, now: Date) {
    return this.withTransaction(async db => {
      await db.$queryRaw`SELECT id FROM messages WHERE id = ${messageId} AND clientId = ${clientId} FOR UPDATE`;
      const message = await db.message.findFirst({ where: { id: messageId, clientId } });
      if (!message) throw new NotFoundException("Message not found.");
      if (message.currentStatus !== "FAILED") throw new ConflictException("Only failed messages can be retried.");
      const latest = await db.messageRouteAttempt.findFirst({
        where: { messageId }, orderBy: { attemptNumber: "desc" },
      });
      if (latest && latest.status !== "FAILED") {
        throw new ConflictException("This message has an active or uncertain submission and cannot be retried.");
      }
      await db.message.update({ where: { id: messageId }, data: { currentStatus: "QUEUED" } });
      const event = await db.messageStatusEvent.create({ data: {
        messageId, attemptId: latest?.id, status: "QUEUED", source: "manual-retry",
        description: "Manual retry requested; starting a new routing cycle.", createdAt: now,
      } });
      const outboxEvent = await db.outboxEvent.create({ data: {
        eventType: "MESSAGE_MANUAL_RETRY", aggregateType: "MESSAGE", aggregateId: messageId,
        queueName, availableAt: now, payload: { messageId, manualRetryEventId: event.id },
      } });
      return { messageId, status: "QUEUED" as const, manualRetryEventId: event.id, outboxEventId: outboxEvent.id };
    });
  }

  private async attachRetryProgress<T extends MessageWithRelations & {
    _count: { routeAttempts: number };
    routeAttempts: { routeId: string; status: import("@prisma/client").MessageRouteAttemptStatus; scheduledAt: Date | null }[];
  }>(items: T[]): Promise<T[]> {
    const pairs = items.flatMap(message => message.routeAttempts.map(attempt => ({ messageId: message.id, routeId: attempt.routeId })));
    // One batch aggregation for the entire page; no query per message.
    const counts = pairs.length ? await this.db.messageRouteAttempt.groupBy({
      by: ["messageId", "routeId"], where: { OR: pairs }, _count: { _all: true },
    }) : [];
    const lookup = new Map(counts.map(row => [`${row.messageId}:${row.routeId}`, row._count._all]));
    return items.map(message => {
      const latest = message.routeAttempts[0];
      return { ...message, retryProgress: {
        attemptCount: message._count.routeAttempts,
        routeSubmissionCount: latest ? lookup.get(`${message.id}:${latest.routeId}`) ?? 0 : 0,
        latestAttemptStatus: latest?.status ?? null,
        scheduledAt: latest?.scheduledAt ?? null,
      } };
    });
  }

}