import {
  PaymentProviderStatus,
  Prisma,
  ServiceStatus
} from "@prisma/client";

import { Injectable } from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  withPromiseSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { CreateProviderServiceDto } from "../dto/create-provider-service.dto.js";
import { FindProviderServicesDto } from "../dto/find-provider-services.dto.js";
import { UpdateProviderServiceDto } from "../dto/update-provider-service.dto.js";

import {
  PaymentProviderNotActiveException,
  PaymentProviderNotFoundException,
  ProviderServiceAlreadyExistsException,
  ProviderServiceNotFoundException,
  ServiceNotActiveException,
  ServiceNotFoundException,
} from "../exceptions/provider-service.exceptions.js";

import {
  PROVIDER_SERVICE_METRICS,
  PROVIDER_SERVICE_OPERATIONS,
} from "../constants/provider-service.constants.js";

import { ProviderServiceMapper } from "../mappers/provider-service.mapper.js";
import { ProviderServicesRepository } from "../repositories/provider-services.repository.js";

@Injectable()
export class ProviderServicesService {
  private readonly logger =
    getComponentLogger("provider-services");

  private readonly createdMetric =
    createCounterMetric({
      name:
        PROVIDER_SERVICE_METRICS.CREATED,
      description:
        "Number of provider service configurations created",
    });

  private readonly updatedMetric =
    createCounterMetric({
      name:
        PROVIDER_SERVICE_METRICS.UPDATED,
      description:
        "Number of provider service configurations updated",
    });

  private readonly enabledMetric =
    createCounterMetric({
      name:
        PROVIDER_SERVICE_METRICS.ENABLED,
      description:
        "Number of provider service configurations enabled",
    });

  private readonly disabledMetric =
    createCounterMetric({
      name:
        PROVIDER_SERVICE_METRICS.DISABLED,
      description:
        "Number of provider service configurations disabled",
    });

  private readonly readMetric =
    createCounterMetric({
      name:
        PROVIDER_SERVICE_METRICS.READ,
      description:
        "Number of provider service configurations retrieved",
    });

  private readonly listedMetric =
    createCounterMetric({
      name:
        PROVIDER_SERVICE_METRICS.LISTED,
      description:
        "Number of provider service list operations",
    });

  constructor(
    private readonly repository: ProviderServicesRepository,
  ) { }

  async create(
    dto: CreateProviderServiceDto,
  ) {
    return withPromiseSpan(
      PROVIDER_SERVICE_OPERATIONS.CREATE,
      async () => {
        const provider =
          await this.repository.findProviderByCode(
            dto.providerCode,
          );

        if (!provider) {
          throw new PaymentProviderNotFoundException(
            dto.providerCode,
          );
        }

        if (
          provider.status !==
          PaymentProviderStatus.ACTIVE
        ) {
          throw new PaymentProviderNotActiveException(
            provider.code,
          );
        }

        const service =
          await this.repository.findServiceByCode(
            dto.serviceCode,
          );

        if (!service) {
          throw new ServiceNotFoundException(
            dto.serviceCode,
          );
        }

        if (
          service.status !==
          ServiceStatus.ACTIVE
        ) {
          throw new ServiceNotActiveException(
            service.code,
          );
        }

        const existing =
          await this.repository.findByProviderAndService(
            provider.id,
            service.id,
          );

        if (existing) {
          throw new ProviderServiceAlreadyExistsException(
            provider.code,
            service.code,
          );
        }

        const providerService =
          await this.repository.create({
            provider: {
              connect: {
                id: provider.id,
              },
            },
            service: {
              connect: {
                id: service.id,
              },
            },
            ...(dto.externalServiceCode !==
              undefined
              ? {
                externalServiceCode:
                  dto.externalServiceCode,
              }
              : {}),
            ...(dto.configuration !==
              undefined
              ? {
                configuration:
                  dto.configuration as Prisma.InputJsonValue,
              }
              : {}),
            active: true,
          });

        this.createdMetric.increment();

        this.logger.info(
          {
            providerServiceId:
              providerService.id,
            providerCode:
              provider.code,
            serviceCode:
              service.code,
          },
          "Provider service created",
        );

        const result =
          await this.repository.findByIdWithRelations(
            providerService.id,
          );

        if (!result) {
          throw new ProviderServiceNotFoundException(
            providerService.id,
          );
        }

        return ProviderServiceMapper.toResponse(
          result,
        );
      },
    );
  }

  async findById(id: string) {
    return withPromiseSpan(
      PROVIDER_SERVICE_OPERATIONS.GET,
      async () => {
        const providerService =
          await this.repository.findByIdWithRelations(
            id,
          );

        if (!providerService) {
          throw new ProviderServiceNotFoundException(
            id,
          );
        }

        this.readMetric.increment();

        return ProviderServiceMapper.toResponse(
          providerService,
        );
      },
    );
  }

  async findMany(
    dto: FindProviderServicesDto,
  ) {
    return withPromiseSpan(
      PROVIDER_SERVICE_OPERATIONS.LIST,
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
            providerCode:
              dto.providerCode,
            serviceCode:
              dto.serviceCode,
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
            ProviderServiceMapper.toResponseList(
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
    dto: UpdateProviderServiceDto,
  ) {
    return withPromiseSpan(
      PROVIDER_SERVICE_OPERATIONS.UPDATE,
      async () => {
        const existing =
          await this.repository.findByIdWithRelations(
            id,
          );

        if (!existing) {
          throw new ProviderServiceNotFoundException(
            id,
          );
        }

        const updated =
          await this.repository.update(
            id,
            {
              ...(dto.externalServiceCode !==
                undefined
                ? {
                  externalServiceCode:
                    dto.externalServiceCode,
                }
                : {}),
              ...(dto.configuration !==
                undefined
                ? {
                  configuration:
                    dto.configuration as Prisma.InputJsonValue,
                }
                : {}),
            },
          );

        this.updatedMetric.increment();

        this.logger.info(
          {
            providerServiceId:
              updated.id,
            providerCode:
              existing.provider.code,
            serviceCode:
              existing.service.code,
          },
          "Provider service updated",
        );

        const result =
          await this.repository.findByIdWithRelations(
            updated.id,
          );

        if (!result) {
          throw new ProviderServiceNotFoundException(
            id,
          );
        }

        return ProviderServiceMapper.toResponse(
          result,
        );
      },
    );
  }

  async enable(id: string) {
    return withPromiseSpan(
      PROVIDER_SERVICE_OPERATIONS.ENABLE,
      async () => {
        const existing =
          await this.repository.findByIdWithRelations(
            id,
          );

        if (!existing) {
          throw new ProviderServiceNotFoundException(
            id,
          );
        }

        if (
          existing.provider.status !==
          PaymentProviderStatus.ACTIVE
        ) {
          throw new PaymentProviderNotActiveException(
            existing.provider.code,
          );
        }

        if (
          existing.service.status !==
          ServiceStatus.ACTIVE
        ) {
          throw new ServiceNotActiveException(
            existing.service.code,
          );
        }

        if (existing.active) {
          return ProviderServiceMapper.toResponse(
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
            providerServiceId:
              updated.id,
            providerCode:
              existing.provider.code,
            serviceCode:
              existing.service.code,
          },
          "Provider service enabled",
        );

        const result =
          await this.repository.findByIdWithRelations(
            updated.id,
          );

        if (!result) {
          throw new ProviderServiceNotFoundException(
            id,
          );
        }

        return ProviderServiceMapper.toResponse(
          result,
        );
      },
    );
  }

  async disable(id: string) {
    return withPromiseSpan(
      PROVIDER_SERVICE_OPERATIONS.DISABLE,
      async () => {
        const existing =
          await this.repository.findByIdWithRelations(
            id,
          );

        if (!existing) {
          throw new ProviderServiceNotFoundException(
            id,
          );
        }

        if (!existing.active) {
          return ProviderServiceMapper.toResponse(
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
            providerServiceId:
              updated.id,
            providerCode:
              existing.provider.code,
            serviceCode:
              existing.service.code,
          },
          "Provider service disabled",
        );

        const result =
          await this.repository.findByIdWithRelations(
            updated.id,
          );

        if (!result) {
          throw new ProviderServiceNotFoundException(
            id,
          );
        }

        return ProviderServiceMapper.toResponse(
          result,
        );
      },
    );
  }

  private buildOrderBy(
    sort?: string,
  ): Prisma.ProviderServiceOrderByWithRelationInput[] {
    if (!sort) {
      return [
        {
          createdAt: "desc",
        },
      ];
    }

    const allowedFields =
      new Set([
        "externalServiceCode",
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
          } as Prisma.ProviderServiceOrderByWithRelationInput;
        })
        .filter(
          (
            value,
          ): value is Prisma.ProviderServiceOrderByWithRelationInput =>
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