import {
  Prisma,
  ServiceStatus,
} from '@prisma/client';

import { Injectable } from '@nestjs/common';

import {
  createCounterMetric,
  getComponentLogger,
  withPromiseSpan,
} from '@pague-co-uk/sms-gateway-telemetry';

import { CreateServiceDto } from '../dto/create-service.dto.js';
import { FindServicesDto } from '../dto/find-services.dto.js';
import { UpdateServiceDto } from '../dto/update-service.dto.js';

import {
  SERVICE_METRICS,
  SERVICE_OPERATIONS,
} from '../constants/service.constants.js';

import {
  ServiceCannotBeDisabledException,
  ServiceCodeAlreadyExistsException,
  ServiceNotFoundException,
} from '../exceptions/service.exceptions.js';

import { ServiceMapper } from '../mappers/service.mapper.js';
import { ServicesRepository } from '../repositories/services.repository.js';

@Injectable()
export class ServicesService {
  private readonly logger =
    getComponentLogger('services');

  private readonly createdMetric =
    createCounterMetric({
      name: SERVICE_METRICS.CREATED,
      description: 'Number of services created',
    });

  private readonly updatedMetric =
    createCounterMetric({
      name: SERVICE_METRICS.UPDATED,
      description: 'Number of services updated',
    });

  private readonly enabledMetric =
    createCounterMetric({
      name: SERVICE_METRICS.ENABLED,
      description: 'Number of services enabled',
    });

  private readonly disabledMetric =
    createCounterMetric({
      name: SERVICE_METRICS.DISABLED,
      description: 'Number of services disabled',
    });

  private readonly readMetric =
    createCounterMetric({
      name: SERVICE_METRICS.READ,
      description: 'Number of individual services retrieved',
    });

  private readonly listedMetric =
    createCounterMetric({
      name: SERVICE_METRICS.LISTED,
      description: 'Number of service list operations',
    });

  constructor(
    private readonly repository: ServicesRepository,
  ) { }

  async create(
    dto: CreateServiceDto,
  ) {
    return withPromiseSpan(
      SERVICE_OPERATIONS.CREATE,
      async () => {
        const existing =
          await this.repository.findByCode(
            dto.code,
          );

        if (existing) {
          throw new ServiceCodeAlreadyExistsException(
            dto.code,
          );
        }

        const service =
          await this.repository.create({
            code: dto.code,
            name: dto.name,
            description: dto.description,
            category: dto.category,
            status: ServiceStatus.ACTIVE,
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
            serviceId: service.id,
            serviceCode: service.code,
            category: service.category,
          },
          'Service created',
        );

        return ServiceMapper.toResponse(
          service,
        );
      },
    );
  }

  async findById(
    id: string,
  ) {
    return withPromiseSpan(
      SERVICE_OPERATIONS.GET,
      async () => {
        const service =
          await this.repository.findById(id);

        if (!service) {
          throw new ServiceNotFoundException(id);
        }

        this.readMetric.increment();

        return ServiceMapper.toResponse(
          service,
        );
      },
    );
  }

  async findMany(
    dto: FindServicesDto,
  ) {
    return withPromiseSpan(
      SERVICE_OPERATIONS.LIST,
      async () => {
        const page =
          await this.repository.findManyPlatform({
            page: dto.page,
            pageSize: dto.pageSize,
            search: dto.search,
            category: dto.category,
            status: dto.status,
            orderBy: this.buildOrderBy(
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
            ServiceMapper.toResponseList(
              page.items,
            ),
          pagination: {
            page: page.page,
            pageSize: page.pageSize,
            totalItems:
              page.totalItems,
            totalPages,
            hasNext:
              page.page < totalPages,
            hasPrevious:
              page.page > 1,
          },
        };
      },
    );
  }

  async update(
    id: string,
    dto: UpdateServiceDto,
  ) {
    return withPromiseSpan(
      SERVICE_OPERATIONS.UPDATE,
      async () => {
        const service =
          await this.repository.findById(id);

        if (!service) {
          throw new ServiceNotFoundException(id);
        }

        const updated =
          await this.repository.update(id, {
            ...(dto.name !== undefined
              ? {
                name: dto.name,
              }
              : {}),

            ...(dto.description !== undefined
              ? {
                description:
                  dto.description,
              }
              : {}),

            ...(dto.category !== undefined
              ? {
                category:
                  dto.category,
              }
              : {}),

            ...(dto.metadata !== undefined
              ? {
                metadata:
                  dto.metadata as Prisma.InputJsonValue,
              }
              : {}),
          });

        this.updatedMetric.increment();

        this.logger.info(
          {
            serviceId: updated.id,
            serviceCode: updated.code,
          },
          'Service updated',
        );

        return ServiceMapper.toResponse(
          updated,
        );
      },
    );
  }

  async updateStatus(
    id: string,
    dto,
  ) {
    return withPromiseSpan(
      SERVICE_OPERATIONS.UPDATE_STATUS,
      async () => {
        const service =
          await this.repository.findById(id);

        if (!service) {
          throw new ServiceNotFoundException(id);
        }

        if (
          service.status === dto.status
        ) {
          return ServiceMapper.toResponse(
            service,
          );
        }

        if (
          dto.status ===
          ServiceStatus.DISABLED
        ) {
          const activeAssignments =
            await this.repository
              .countActiveClientAssignments(
                id,
              );

          if (activeAssignments > 0) {
            throw new ServiceCannotBeDisabledException(
              service.code,
            );
          }
        }

        const updated =
          await this.repository.update(id, {
            status: dto.status,
          });

        if (
          dto.status ===
          ServiceStatus.ACTIVE
        ) {
          this.enabledMetric.increment();
        } else {
          this.disabledMetric.increment();
        }

        this.logger.info(
          {
            serviceId: updated.id,
            serviceCode: updated.code,
            previousStatus:
              service.status,
            status: updated.status,
          },
          'Service status changed',
        );

        return ServiceMapper.toResponse(
          updated,
        );
      },
    );
  }

  private buildOrderBy(
    sort?: string,
  ): Prisma.ServiceOrderByWithRelationInput[] {
    if (!sort) {
      return [
        {
          createdAt: 'desc',
        },
      ];
    }

    const allowedFields = new Set([
      'code',
      'name',
      'category',
      'status',
      'createdAt',
      'updatedAt',
    ]);

    const orderBy =
      sort
        .split(',')
        .map((field) => {
          const trimmed =
            field.trim();

          if (!trimmed) {
            return null;
          }

          const descending =
            trimmed.startsWith('-');

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
                ? 'desc'
                : 'asc',
          } as Prisma.ServiceOrderByWithRelationInput;
        })
        .filter(
          (
            value,
          ): value is Prisma.ServiceOrderByWithRelationInput =>
            value !== null,
        );

    return orderBy.length > 0
      ? orderBy
      : [
        {
          createdAt: 'desc',
        },
      ];
  }
}