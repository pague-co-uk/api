import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  withPromiseSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import type {
  AuthenticatedUser,
} from "../../../common/authorization/interfaces/authenticated-user.interface.js";

import {
  AppConfigService,
} from "../../../config/config.service.js";

import {
  FindTransactionsDto,
} from "../dto/find-transactions.dto.js";

import {
  TransactionResponseDto,
} from "../dto/transaction-response.dto.js";

import {
  TransactionMapper,
} from "../mappers/transaction.mapper.js";

import {
  TransactionsRepository,
} from "../repositories/transactions.repository.js";

export interface TransactionListResponse {
  data: TransactionResponseDto[];

  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

@Injectable()
export class TransactionsService {
  private readonly logger =
    getComponentLogger(
      "transactions-service",
    );

  private readonly transactionsReadMetric =
    createCounterMetric({
      name: "transactions.read",
      description:
        "Number of individual transactions retrieved.",
    });

  private readonly transactionsListedMetric =
    createCounterMetric({
      name: "transactions.listed",
      description:
        "Number of transaction list operations.",
    });

  constructor(
    private readonly transactionsRepository:
      TransactionsRepository,

    private readonly config:
      AppConfigService,
  ) { }

  async findById(
    user: AuthenticatedUser,
    id: string,
  ): Promise<TransactionResponseDto> {
    return withPromiseSpan(
      "transactions.service.findById",
      async () => {
        const clientId =
          this.resolveClientId(user);

        this.logger.info(
          {
            transactionId: id,
            clientId,
          },
          "Retrieving transaction.",
        );

        const transaction =
          await this.transactionsRepository.findByIdWithRelations(
            id,
            clientId,
          );

        if (!transaction) {
          this.logger.warn(
            {
              transactionId: id,
              clientId,
            },
            "Transaction not found.",
          );

          throw new NotFoundException(
            `Transaction with ID "${id}" was not found.`,
          );
        }

        this.transactionsReadMetric.add(1);

        return TransactionMapper.toResponse(
          transaction,
        );
      },
    );
  }

  async findMany(
    user: AuthenticatedUser,
    dto: FindTransactionsDto,
  ): Promise<TransactionListResponse> {
    return withPromiseSpan(
      "transactions.service.findMany",
      async () => {
        const page =
          dto.page ?? 1;

        const pageSize =
          dto.pageSize ?? 20;

        const clientId =
          this.resolveClientId(user);

        this.logger.info(
          {
            clientId,
            page,
            pageSize,
            status: dto.status,
            search: dto.search,
          },
          "Retrieving transactions.",
        );

        const result =
          await this.transactionsRepository.findManyPlatform({
            page,
            pageSize,
            search: dto.search,
            status: dto.status,
            clientId,
            clientServiceId:
              dto.clientServiceId,
            providerId:
              dto.providerId,
            providerServiceId:
              dto.providerServiceId,
            currencyId:
              dto.currencyId,
            transactionTypeId:
              dto.transactionTypeId,
            orderBy:
              this.buildOrderBy(
                dto.sort,
              ),
          });

        const totalPages =
          result.totalItems === 0
            ? 0
            : Math.ceil(
              result.totalItems /
              result.pageSize,
            );

        this.transactionsListedMetric.add(1);

        return {
          data:
            TransactionMapper.toResponseList(
              result.items,
            ),

          pagination: {
            page: result.page,
            pageSize: result.pageSize,
            totalItems:
              result.totalItems,
            totalPages,

            hasNext:
              result.page <
              totalPages,

            hasPrevious:
              result.page > 1,
          },
        };
      },
    );
  }

  private resolveClientId(
    user: AuthenticatedUser,
  ): string | undefined {
    return user.clientId ===
      this.config.app.platformClient
      ? undefined
      : user.clientId;
  }

  private buildOrderBy(
    sort?: string,
  ): Array<{
    [key: string]: "asc" | "desc";
  }> {
    const allowedFields =
      new Set([
        "publicId",
        "reference",
        "amount",
        "status",
        "processedAt",
        "createdAt",
        "updatedAt",
      ]);

    if (!sort?.trim()) {
      return [
        {
          createdAt: "desc",
        },
      ];
    }

    const orderBy: Array<{
      [key: string]: "asc" | "desc";
    }> = [];

    for (
      const rawField of sort.split(",")
    ) {
      const field =
        rawField.trim();

      if (!field) {
        continue;
      }

      const descending =
        field.startsWith("-");

      const fieldName =
        descending
          ? field.slice(1)
          : field;

      if (
        !allowedFields.has(
          fieldName,
        )
      ) {
        continue;
      }

      orderBy.push({
        [fieldName]:
          descending
            ? "desc"
            : "asc",
      });
    }

    return orderBy.length > 0
      ? orderBy
      : [
        {
          createdAt: "desc",
        },
      ];
  }
}