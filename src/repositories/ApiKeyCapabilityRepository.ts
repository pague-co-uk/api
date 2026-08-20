import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  ApiKeyCapability,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";
import { DatabaseRepository } from "../database/database.repository.js";

@Injectable()
export class ApiKeyCapabilityRepository
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
    return new ApiKeyCapabilityRepository(
      db,
    ) as this;
  }

  async findByName(
    name: string,
  ): Promise<ApiKeyCapability | null> {
    return this.execute(
      "SELECT",
      "api_key_capabilities",
      async () => {
        const result =
          await this.db.apiKeyCapability.findUnique({
            where: {
              name,
            },
          });

        return {
          result,
          rowsAffected: result ? 1 : 0,
        };
      },
    );
  }

  async findByNames(
    names: readonly string[],
  ): Promise<ApiKeyCapability[]> {
    if (names.length === 0) {
      return [];
    }

    return this.execute(
      "SELECT",
      "api_key_capabilities",
      async () => {
        const result =
          await this.db.apiKeyCapability.findMany({
            where: {
              name: {
                in: [...names],
              },
            },
          });

        return {
          result,
          rowsAffected: result.length,
        };
      },
    );
  }

  async findAll(): Promise<
    ApiKeyCapability[]
  > {
    return this.execute(
      "SELECT",
      "api_key_capabilities",
      async () => {
        const result =
          await this.db.apiKeyCapability.findMany({
            orderBy: [
              {
                module: "asc",
              },
              {
                name: "asc",
              },
            ],
          });

        return {
          result,
          rowsAffected: result.length,
        };
      },
    );
  }

  async create(
    data: Prisma.ApiKeyCapabilityCreateInput,
  ): Promise<ApiKeyCapability> {
    return this.execute(
      "INSERT",
      "api_key_capabilities",
      async () => {
        const result =
          await this.db.apiKeyCapability.create({
            data,
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  async upsert(
    data: Prisma.ApiKeyCapabilityUpsertArgs,
  ): Promise<ApiKeyCapability> {
    return this.execute(
      "UPSERT",
      "api_key_capabilities",
      async () => {
        const result =
          await this.db.apiKeyCapability.upsert(
            data,
          );

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }
}