import {
  Prisma,
} from "@prisma/client";

import { Injectable } from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  withPromiseSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { CreateTransactionTypeDto } from "../dto/create-transaction-type.dto.js";
import { FindTransactionTypesDto } from "../dto/find-transaction-types.dto.js";
import { UpdateTransactionTypeDto } from "../dto/update-transaction-type.dto.js";

import {
  TransactionTypeAlreadyExistsException,
  TransactionTypeNotFoundException,
} from "../exceptions/transaction-type.exceptions.js";

import {
  TRANSACTION_TYPE_METRICS,
  TRANSACTION_TYPE_OPERATIONS,
} from "../constants/transaction-type.constants.js";

import { TransactionTypeMapper } from "../mappers/transaction-type.mapper.js";
import { TransactionTypesRepository } from "../repositories/transaction-type.repository.js";

@Injectable()
export class TransactionTypesService {
  private readonly logger =
    getComponentLogger("transaction-types");

  private readonly createdMetric =
    createCounterMetric({
      name:
        TRANSACTION_TYPE_METRICS.CREATED,
      description:
        "Number of transaction types created",
    });

  private readonly updatedMetric =
    createCounterMetric({
      name:
        TRANSACTION_TYPE_METRICS.UPDATED,
      description:
        "Number of transaction types updated",
    });

  private readonly enabledMetric =
    createCounterMetric({
      name:
        TRANSACTION_TYPE_METRICS.ENABLED,
      description:
        "Number of transaction types enabled",
    });

  private readonly disabledMetric =
    createCounterMetric({
      name:
        TRANSACTION_TYPE_METRICS.DISABLED,
      description:
        "Number of transaction types disabled",
    });

  private readonly readMetric =
    createCounterMetric({
      name:
        TRANSACTION_TYPE_METRICS.READ,
      description:
        "Number of transaction types retrieved",
    });

  private readonly listedMetric =
    createCounterMetric({
      name:
        TRANSACTION_TYPE_METRICS.LISTED,
      description:
        "Number of transaction type list operations",
    });

  constructor(
    private readonly repository: TransactionTypesRepository,
  ) { }

  async create(
    dto: CreateTransactionTypeDto,
  ) {
    return withPromiseSpan(
      TRANSACTION_TYPE_OPERATIONS.CREATE,
      async () => {
        const existing =
          await this.repository.findByCode(
            dto.code,
          );

        if (existing) {
          throw new TransactionTypeAlreadyExistsException(
            dto.code,
          );
        }

        const transactionType =
          await this.repository.create({
            code: dto.code,
            name: dto.name,
            ...(dto.description !==
              undefined
              ? {
                description:
                  dto.description,
              }
              : {}),
            active: true,
          });

        this.createdMetric.increment();

        this.logger.info(
          {
            transactionTypeId:
              transactionType.id,
            code: transactionType.code,
          },
          "Transaction type created",
        );

        return TransactionTypeMapper.toResponse(
          transactionType,
        );
      },
    );
  }

  async findById(id: string) {
    return withPromiseSpan(
      TRANSACTION_TYPE_OPERATIONS.GET,
      async () => {
        const transactionType =
          await this.repository.findById(
            id,
          );

        if (!transactionType) {
          throw new TransactionTypeNotFoundException(
            id,
          );
        }

        this.readMetric.increment();

        return TransactionTypeMapper.toResponse(
          transactionType,
        );
      },
    );
  }

  async findMany(
    dto: FindTransactionTypesDto,
  ) {
    return withPromiseSpan(
      TRANSACTION_TYPE_OPERATIONS.LIST,
      async () => {
        const active =
          dto.active !== undefined
            ? dto.active === "true"
            : undefined;

        const page =
          await this.repository.findManyPlatform({
            page: dto.page,
            pageSize: dto.pageSize,
            active,
            search: dto.search,
            orderBy:
              this.buildOrderBy(
                dto.sort,
              ),
          });

        this.listedMetric.increment();

        const totalPages =
          Math.ceil(
            page.totalItems /
            page.pageSize,
          );

        return {
          data:
            TransactionTypeMapper.toResponseList(
              page.items,
            ),
          pagination: {
            page: page.page,
            pageSize:
              page.pageSize,
            totalItems:
              page.totalItems,
            totalPages,
            hasNext:
              page.page <
              totalPages,
            hasPrevious:
              page.page > 1,
          },
        };
      },
    );
  }

  async update(
    id: string,
    dto: UpdateTransactionTypeDto,
  ) {
    return withPromiseSpan(
      TRANSACTION_TYPE_OPERATIONS.UPDATE,
      async () => {
        const existing =
          await this.repository.findById(
            id,
          );

        if (!existing) {
          throw new TransactionTypeNotFoundException(
            id,
          );
        }

        const updated =
          await this.repository.update(
            id,
            {
              ...(dto.name !== undefined
                ? {
                  name: dto.name,
                }
                : {}),
              ...(dto.description !==
                undefined
                ? {
                  description:
                    dto.description,
                }
                : {}),
            },
          );

        this.updatedMetric.increment();

        this.logger.info(
          {
            transactionTypeId:
              updated.id,
            code: updated.code,
          },
          "Transaction type updated",
        );

        return TransactionTypeMapper.toResponse(
          updated,
        );
      },
    );
  }

  async enable(id: string) {
    return withPromiseSpan(
      TRANSACTION_TYPE_OPERATIONS.ENABLE,
      async () => {
        const existing =
          await this.repository.findById(
            id,
          );

        if (!existing) {
          throw new TransactionTypeNotFoundException(
            id,
          );
        }

        if (existing.active) {
          return TransactionTypeMapper.toResponse(
            existing,
          );
        }

        const updated =
          await this.repository.update(
            id,
            {
              active: true,
            },
          );

        this.enabledMetric.increment();

        this.logger.info(
          {
            transactionTypeId:
              updated.id,
            code: updated.code,
          },
          "Transaction type enabled",
        );

        return TransactionTypeMapper.toResponse(
          updated,
        );
      },
    );
  }

  async disable(id: string) {
    return withPromiseSpan(
      TRANSACTION_TYPE_OPERATIONS.DISABLE,
      async () => {
        const existing =
          await this.repository.findById(
            id,
          );

        if (!existing) {
          throw new TransactionTypeNotFoundException(
            id,
          );
        }

        if (!existing.active) {
          return TransactionTypeMapper.toResponse(
            existing,
          );
        }

        const updated =
          await this.repository.update(
            id,
            {
              active: false,
            },
          );

        this.disabledMetric.increment();

        this.logger.info(
          {
            transactionTypeId:
              updated.id,
            code: updated.code,
          },
          "Transaction type disabled",
        );

        return TransactionTypeMapper.toResponse(
          updated,
        );
      },
    );
  }

  private buildOrderBy(
    sort?: string,
  ): Prisma.TransactionTypeOrderByWithRelationInput[] {
    if (!sort) {
      return [
        {
          createdAt: "desc",
        },
      ];
    }

    const allowedFields =
      new Set([
        "code",
        "name",
        "active",
        "createdAt",
        "updatedAt",
      ]);

    const orderBy =
      sort
        .split(",")
        .map((field) => {
          const trimmed =
            field.trim();

          if (!trimmed) {
            return null;
          }

          const descending =
            trimmed.startsWith("-");

          const fieldName =
            descending
              ? trimmed.substring(1)
              : trimmed;

          if (
            !allowedFields.has(
              fieldName,
            )
          ) {
            return null;
          }

          return {
            [fieldName]:
              descending
                ? "desc"
                : "asc",
          } as Prisma.TransactionTypeOrderByWithRelationInput;
        })
        .filter(
          (
            value,
          ): value is Prisma.TransactionTypeOrderByWithRelationInput =>
            value !== null,
        );

    return orderBy.length > 0
      ? orderBy
      : [
        {
          createdAt: "desc",
        },
      ];
  }
}