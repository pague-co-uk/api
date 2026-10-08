import {
  ClientServiceStatus,
  Prisma,
  ServiceCategory,
  ServiceStatus,
} from "@prisma/client";

import { Injectable } from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  withPromiseSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { CreateClientServiceDto } from "../dto/create-client-service.dto.js";
import { FindClientServicesDto } from "../dto/find-client-services.dto.js";
import { UpdateClientServiceDto } from "../dto/update-client-service.dto.js";

import {
  ClientNotFoundException,
  ClientServiceAlreadyExistsException,
  ClientServiceCannotBeEnabledException,
  ClientServiceNotFoundException,
  PaymentServiceInvalidCurrenciesException,
  PaymentServiceInvalidTransactionTypesException,
  ServiceNotActiveException,
  ServiceNotFoundException,
} from "../exceptions/client-service.exceptions.js";

import {
  CLIENT_SERVICE_METRICS,
  CLIENT_SERVICE_OPERATIONS,
} from "../constants/client-service.constants.js";

import { PaymentServiceConfigurationValidator } from "../../../modules/payments/configuration/payment-service-configuration.validator.js";
import type { PaymentServiceConfiguration } from "../../../modules/payments/configuration/payment-service.configuration.js";

import { ClientServiceMapper } from "../mapper/client-service.mapper.js";
import { ClientServicesRepository } from "../repositories/client-services.repository.js";

@Injectable()
export class ClientServicesService {
  private readonly logger =
    getComponentLogger("client-services");

  private readonly createdMetric =
    createCounterMetric({
      name: CLIENT_SERVICE_METRICS.CREATED,
      description:
        "Number of client service assignments created",
    });

  private readonly updatedMetric =
    createCounterMetric({
      name: CLIENT_SERVICE_METRICS.UPDATED,
      description:
        "Number of client service assignments updated",
    });

  private readonly enabledMetric =
    createCounterMetric({
      name: CLIENT_SERVICE_METRICS.ENABLED,
      description:
        "Number of client service assignments enabled",
    });

  private readonly disabledMetric =
    createCounterMetric({
      name: CLIENT_SERVICE_METRICS.DISABLED,
      description:
        "Number of client service assignments disabled",
    });

  private readonly readMetric =
    createCounterMetric({
      name: CLIENT_SERVICE_METRICS.READ,
      description:
        "Number of client service assignments retrieved",
    });

  private readonly listedMetric =
    createCounterMetric({
      name: CLIENT_SERVICE_METRICS.LISTED,
      description:
        "Number of client service list operations",
    });

  constructor(
    private readonly repository: ClientServicesRepository,
  ) { }

  async create(
    clientId: string,
    dto: CreateClientServiceDto,
  ) {
    return withPromiseSpan(
      CLIENT_SERVICE_OPERATIONS.CREATE,
      async () => {
        const clientExists =
          await this.repository.existsClient(
            clientId,
          );

        if (!clientExists) {
          throw new ClientNotFoundException(
            clientId,
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

        let configuration:
          | PaymentServiceConfiguration
          | Record<string, unknown>
          | undefined =
          dto.configuration;

        if (
          service.category ===
          ServiceCategory.PAYMENTS
        ) {
          configuration =
            await this.validatePaymentConfiguration(
              dto.configuration,
            );
        }

        const existing =
          await this.repository.findByClientAndService(
            clientId,
            service.id,
          );

        if (existing) {
          throw new ClientServiceAlreadyExistsException(
            clientId,
            service.code,
          );
        }

        const clientService =
          await this.repository.create({
            client: {
              connect: {
                id: clientId,
              },
            },
            service: {
              connect: {
                id: service.id,
              },
            },
            status:
              ClientServiceStatus.ACTIVE,
            ...(configuration !== undefined
              ? {
                configuration:
                  configuration as Prisma.InputJsonValue,
              }
              : {}),
          });

        this.createdMetric.increment();

        this.logger.info(
          {
            clientServiceId:
              clientService.id,
            clientId,
            serviceCode:
              service.code,
          },
          "Client service assignment created",
        );

        const result =
          await this.repository.findByIdWithService(
            clientService.id,
          );

        if (!result) {
          throw new ClientServiceNotFoundException(
            clientService.clientId,
            clientService.id,
          );
        }

        return ClientServiceMapper.toResponse(
          result,
        );
      },
    );
  }

  async findById(
    clientId: string,
    serviceId: string,
  ) {
    return withPromiseSpan(
      CLIENT_SERVICE_OPERATIONS.GET,
      async () => {
        const result =
          await this.repository
            .findByClientAndServiceWithService(
              clientId,
              serviceId,
            );

        if (!result) {
          throw new ClientServiceNotFoundException(
            clientId,
            serviceId,
          );
        }

        this.readMetric.increment();

        return ClientServiceMapper.toResponse(
          result,
        );
      },
    );
  }

  async findMany(
    clientId: string,
    dto: FindClientServicesDto,
  ) {
    return withPromiseSpan(
      CLIENT_SERVICE_OPERATIONS.LIST,
      async () => {
        const clientExists =
          await this.repository.existsClient(
            clientId,
          );

        if (!clientExists) {
          throw new ClientNotFoundException(
            clientId,
          );
        }

        const page =
          await this.repository.findManyPlatform({
            clientId,
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
            ClientServiceMapper.toResponseList(
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
    clientId: string,
    serviceId: string,
    dto: UpdateClientServiceDto,
  ) {
    return withPromiseSpan(
      CLIENT_SERVICE_OPERATIONS.UPDATE,
      async () => {
        const existing =
          await this.repository.findByClientAndService(
            clientId,
            serviceId,
          );

        if (!existing) {
          throw new ClientServiceNotFoundException(
            clientId,
            serviceId,
          );
        }

        const existingWithService =
          await this.repository.findByIdWithService(
            existing.id,
          );

        if (!existingWithService) {
          throw new ClientServiceNotFoundException(
            clientId,
            serviceId,
          );
        }

        let configuration:
          | PaymentServiceConfiguration
          | Record<string, unknown>
          | undefined;

        if (
          dto.configuration !==
          undefined
        ) {
          if (
            existingWithService.service
              .category ===
            ServiceCategory.PAYMENTS
          ) {
            configuration =
              await this.validatePaymentConfiguration(
                dto.configuration,
              );
          } else {
            configuration =
              dto.configuration;
          }
        }

        const updated =
          await this.repository.update(
            existing.id,
            {
              ...(configuration !==
                undefined
                ? {
                  configuration:
                    configuration as Prisma.InputJsonValue,
                }
                : {}),
            },
          );

        this.updatedMetric.increment();

        this.logger.info(
          {
            clientServiceId:
              updated.id,
            clientId,
            serviceId,
          },
          "Client service assignment updated",
        );

        const result =
          await this.repository.findByIdWithService(
            updated.id,
          );

        if (!result) {
          throw new ClientServiceNotFoundException(
            clientId,
            serviceId,
          );
        }

        return ClientServiceMapper.toResponse(
          result,
        );
      },
    );
  }

  async enable(
    clientId: string,
    serviceId: string,
  ) {
    return withPromiseSpan(
      CLIENT_SERVICE_OPERATIONS.ENABLE,
      async () => {
        const existing =
          await this.repository
            .findByClientAndServiceWithService(
              clientId,
              serviceId,
            );

        if (!existing) {
          throw new ClientServiceNotFoundException(
            clientId,
            serviceId,
          );
        }

        if (
          existing.service.status !==
          ServiceStatus.ACTIVE
        ) {
          throw new ClientServiceCannotBeEnabledException(
            existing.service.code,
          );
        }

        if (
          existing.status ===
          ClientServiceStatus.ACTIVE
        ) {
          return ClientServiceMapper.toResponse(
            existing,
          );
        }

        const updated =
          await this.repository.update(
            existing.id,
            {
              status:
                ClientServiceStatus.ACTIVE,
              enabledAt: new Date(),
              disabledAt: null,
            },
          );

        this.enabledMetric.increment();

        this.logger.info(
          {
            clientServiceId:
              updated.id,
            clientId,
            serviceCode:
              existing.service.code,
          },
          "Client service assignment enabled",
        );

        const result =
          await this.repository
            .findByIdWithService(
              updated.id,
            );

        if (!result) {
          throw new ClientServiceNotFoundException(
            clientId,
            serviceId,
          );
        }

        return ClientServiceMapper.toResponse(
          result,
        );
      },
    );
  }

  async disable(
    clientId: string,
    serviceId: string,
  ) {
    return withPromiseSpan(
      CLIENT_SERVICE_OPERATIONS.DISABLE,
      async () => {
        const existing =
          await this.repository
            .findByClientAndServiceWithService(
              clientId,
              serviceId,
            );

        if (!existing) {
          throw new ClientServiceNotFoundException(
            clientId,
            serviceId,
          );
        }

        if (
          existing.status ===
          ClientServiceStatus.DISABLED
        ) {
          return ClientServiceMapper.toResponse(
            existing,
          );
        }

        const updated =
          await this.repository.update(
            existing.id,
            {
              status:
                ClientServiceStatus.DISABLED,
              disabledAt: new Date(),
            },
          );

        this.disabledMetric.increment();

        this.logger.info(
          {
            clientServiceId:
              updated.id,
            clientId,
            serviceCode:
              existing.service.code,
          },
          "Client service assignment disabled",
        );

        const result =
          await this.repository
            .findByIdWithService(
              updated.id,
            );

        if (!result) {
          throw new ClientServiceNotFoundException(
            clientId,
            serviceId,
          );
        }

        return ClientServiceMapper.toResponse(
          result,
        );
      },
    );
  }

  private buildOrderBy(
    sort?: string,
  ): Prisma.ClientServiceOrderByWithRelationInput[] {
    if (!sort) {
      return [
        {
          createdAt: "desc",
        },
      ];
    }

    const allowedFields =
      new Set([
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
          } as Prisma.ClientServiceOrderByWithRelationInput;
        })
        .filter(
          (
            value,
          ): value is Prisma.ClientServiceOrderByWithRelationInput =>
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

  private async validatePaymentConfiguration(
    configuration: unknown,
  ): Promise<PaymentServiceConfiguration> {
    const validated =
      PaymentServiceConfigurationValidator.validate(
        configuration,
      );

    const configuredCurrencies =
      validated.validation.currencies;

    const configuredTransactionTypes =
      validated.validation
        .transactionTypes;

    const currencies =
      await this.repository.findActiveCurrenciesByCodes(
        configuredCurrencies,
      );

    const activeCurrencyCodes =
      new Set(
        currencies.map(
          (currency) => currency.code,
        ),
      );

    const invalidCurrencies =
      configuredCurrencies.filter(
        (code) =>
          !activeCurrencyCodes.has(
            code,
          ),
      );

    if (invalidCurrencies.length > 0) {
      throw new PaymentServiceInvalidCurrenciesException(
        invalidCurrencies,
      );
    }
    const transactionTypes =
      await this.repository.findActiveTransactionTypesByCodes(
        configuredTransactionTypes,
      );

    const activeTransactionTypeCodes =
      new Set(
        transactionTypes.map(
          (transactionType) =>
            transactionType.code,
        ),
      );

    const invalidTransactionTypes =
      configuredTransactionTypes.filter(
        (code) =>
          !activeTransactionTypeCodes.has(
            code,
          ),
      );

    if (invalidTransactionTypes.length > 0) {
      throw new PaymentServiceInvalidTransactionTypesException(
        invalidTransactionTypes,
      );
    }
    return validated;
  }
}