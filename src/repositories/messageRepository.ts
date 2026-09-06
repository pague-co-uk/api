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

            orderBy: {
              submittedAt: "desc",
            },

            skip,
            take: pageSize,
          }),
        ]);

        return {
          result: {
            items,
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

            orderBy: {
              submittedAt: "desc",
            },

            skip,
            take: pageSize,
          }),
        ]);

        return {
          result: {
            items,
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
}