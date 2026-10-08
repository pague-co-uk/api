import {
  PaymentProviderStatus,
  Prisma,
} from "@prisma/client";

import { Injectable } from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  withPromiseSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { CreatePaymentProviderDto } from "../dto/create-payment-provider.dto.js";
import { FindPaymentProvidersDto } from "../dto/find-payment-providers.dto.js";
import { UpdatePaymentProviderDto } from "../dto/update-payment-provider.dto.js";

import {
  PaymentProviderAlreadyExistsException,
  PaymentProviderCannotBeDisabledException,
  PaymentProviderNotFoundException,
} from "../exceptions/payment-provider.exceptions.js";

import {
  PAYMENT_PROVIDER_METRICS,
  PAYMENT_PROVIDER_OPERATIONS,
} from "../constants/payment-provider.constants.js";

import { PaymentProviderMapper } from "../mappers/payment-provider.mapper.js";
import { PaymentProvidersRepository } from "../repositories/payment-providers.repository.js";

@Injectable()
export class PaymentProvidersService {
  private readonly logger =
    getComponentLogger("payment-providers");

  private readonly createdMetric =
    createCounterMetric({
      name: PAYMENT_PROVIDER_METRICS.CREATED,
      description:
        "Number of payment providers created",
    });

  private readonly updatedMetric =
    createCounterMetric({
      name: PAYMENT_PROVIDER_METRICS.UPDATED,
      description:
        "Number of payment providers updated",
    });

  private readonly enabledMetric =
    createCounterMetric({
      name: PAYMENT_PROVIDER_METRICS.ENABLED,
      description:
        "Number of payment providers enabled",
    });

  private readonly disabledMetric =
    createCounterMetric({
      name: PAYMENT_PROVIDER_METRICS.DISABLED,
      description:
        "Number of payment providers disabled",
    });

  private readonly readMetric =
    createCounterMetric({
      name: PAYMENT_PROVIDER_METRICS.READ,
      description:
        "Number of payment providers retrieved",
    });

  private readonly listedMetric =
    createCounterMetric({
      name: PAYMENT_PROVIDER_METRICS.LISTED,
      description:
        "Number of payment provider list operations",
    });

  constructor(
    private readonly repository: PaymentProvidersRepository,
  ) { }

  async create(
    dto: CreatePaymentProviderDto,
  ) {
    return withPromiseSpan(
      PAYMENT_PROVIDER_OPERATIONS.CREATE,
      async () => {
        const existing =
          await this.repository.findByCode(
            dto.code,
          );

        if (existing) {
          throw new PaymentProviderAlreadyExistsException(
            dto.code,
          );
        }

        const provider =
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
            status:
              PaymentProviderStatus.ACTIVE,
            ...(dto.metadata !== undefined
              ? {
                metadata:
                  dto.metadata as Prisma.InputJsonValue,
              }
              : {}),
          });

        this.createdMetric.increment();

        this.logger.info(
          {
            paymentProviderId:
              provider.id,
            code: provider.code,
          },
          "Payment provider created",
        );

        return PaymentProviderMapper.toResponse(
          provider,
        );
      },
    );
  }

  async findById(id: string) {
    return withPromiseSpan(
      PAYMENT_PROVIDER_OPERATIONS.GET,
      async () => {
        const provider =
          await this.repository.findById(id);

        if (!provider) {
          throw new PaymentProviderNotFoundException(
            id,
          );
        }

        this.readMetric.increment();

        return PaymentProviderMapper.toResponse(
          provider,
        );
      },
    );
  }

  async findMany(
    dto: FindPaymentProvidersDto,
  ) {
    return withPromiseSpan(
      PAYMENT_PROVIDER_OPERATIONS.LIST,
      async () => {
        const page =
          await this.repository.findManyPlatform({
            page: dto.page,
            pageSize: dto.pageSize,
            status: dto.status,
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
            PaymentProviderMapper.toResponseList(
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
    dto: UpdatePaymentProviderDto,
  ) {
    return withPromiseSpan(
      PAYMENT_PROVIDER_OPERATIONS.UPDATE,
      async () => {
        const existing =
          await this.repository.findById(
            id,
          );

        if (!existing) {
          throw new PaymentProviderNotFoundException(
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
              ...(dto.metadata !==
                undefined
                ? {
                  metadata:
                    dto.metadata as Prisma.InputJsonValue,
                }
                : {}),
            },
          );

        this.updatedMetric.increment();

        this.logger.info(
          {
            paymentProviderId:
              updated.id,
            code: updated.code,
          },
          "Payment provider updated",
        );

        return PaymentProviderMapper.toResponse(
          updated,
        );
      },
    );
  }

  async enable(id: string) {
    return withPromiseSpan(
      PAYMENT_PROVIDER_OPERATIONS.ENABLE,
      async () => {
        const existing =
          await this.repository.findById(
            id,
          );

        if (!existing) {
          throw new PaymentProviderNotFoundException(
            id,
          );
        }

        if (
          existing.status ===
          PaymentProviderStatus.ACTIVE
        ) {
          return PaymentProviderMapper.toResponse(
            existing,
          );
        }

        const updated =
          await this.repository.update(
            id,
            {
              status:
                PaymentProviderStatus.ACTIVE,
            },
          );

        this.enabledMetric.increment();

        this.logger.info(
          {
            paymentProviderId:
              updated.id,
            code: updated.code,
          },
          "Payment provider enabled",
        );

        return PaymentProviderMapper.toResponse(
          updated,
        );
      },
    );
  }

  async disable(id: string) {
    return withPromiseSpan(
      PAYMENT_PROVIDER_OPERATIONS.DISABLE,
      async () => {
        const existing =
          await this.repository.findById(
            id,
          );

        if (!existing) {
          throw new PaymentProviderNotFoundException(
            id,
          );
        }

        if (
          existing.status ===
          PaymentProviderStatus.DISABLED
        ) {
          return PaymentProviderMapper.toResponse(
            existing,
          );
        }

        const activeProviderServices =
          await this.repository.countActiveProviderServices(
            id,
          );

        if (
          activeProviderServices > 0
        ) {
          throw new PaymentProviderCannotBeDisabledException(
            existing.code,
          );
        }

        const updated =
          await this.repository.update(
            id,
            {
              status:
                PaymentProviderStatus.DISABLED,
            },
          );

        this.disabledMetric.increment();

        this.logger.info(
          {
            paymentProviderId:
              updated.id,
            code: updated.code,
          },
          "Payment provider disabled",
        );

        return PaymentProviderMapper.toResponse(
          updated,
        );
      },
    );
  }

  private buildOrderBy(
    sort?: string,
  ): Prisma.PaymentProviderOrderByWithRelationInput[] {
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
        "status",
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
          } as Prisma.PaymentProviderOrderByWithRelationInput;
        })
        .filter(
          (
            value,
          ): value is Prisma.PaymentProviderOrderByWithRelationInput =>
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