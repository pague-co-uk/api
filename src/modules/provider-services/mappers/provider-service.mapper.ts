import {
  PaymentProvider,
  ProviderService,
  Service,
} from "@prisma/client";

import { ProviderServiceResponseDto } from "../dto/provider-service-response.dto.js";

type ProviderServiceWithRelations =
  ProviderService & {
    provider: PaymentProvider;
    service: Service;
  };

export class ProviderServiceMapper {
  static toResponse(
    providerService: ProviderServiceWithRelations,
  ): ProviderServiceResponseDto {
    return {
      id: providerService.id,

      providerId:
        providerService.providerId,
      providerCode:
        providerService.provider.code,
      providerName:
        providerService.provider.name,
      providerStatus:
        providerService.provider.status,

      serviceId:
        providerService.serviceId,
      serviceCode:
        providerService.service.code,
      serviceName:
        providerService.service.name,
      serviceCategory:
        providerService.service.category,
      serviceStatus:
        providerService.service.status,

      externalServiceCode:
        providerService.externalServiceCode,

      configuration:
        providerService.configuration as
        | Record<string, unknown>
        | null,

      active:
        providerService.active,

      createdAt:
        providerService.createdAt,
      updatedAt:
        providerService.updatedAt,
    };
  }

  static toResponseList(
    providerServices: readonly ProviderServiceWithRelations[],
  ): ProviderServiceResponseDto[] {
    return providerServices.map(
      (providerService) =>
        this.toResponse(providerService),
    );
  }
}