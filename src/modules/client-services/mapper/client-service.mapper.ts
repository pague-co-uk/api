import {
  ClientService,
  Service,
} from "@prisma/client";

import { ClientServiceResponseDto } from "../dto/client-service-response.dto.js";

type ClientServiceWithService =
  ClientService & {
    service: Service;
  };

export class ClientServiceMapper {
  static toResponse(
    clientService: ClientServiceWithService,
  ): ClientServiceResponseDto {
    return {
      id: clientService.id,
      clientId:
        clientService.clientId,
      serviceId:
        clientService.serviceId,

      serviceCode:
        clientService.service.code,

      serviceName:
        clientService.service.name,

      serviceCategory:
        clientService.service.category,

      serviceStatus:
        clientService.service.status,

      status:
        clientService.status,

      configuration:
        clientService.configuration as
        | Record<string, unknown>
        | null,

      enabledAt:
        clientService.enabledAt,

      disabledAt:
        clientService.disabledAt,

      createdAt:
        clientService.createdAt,

      updatedAt:
        clientService.updatedAt,
    };
  }

  static toResponseList(
    clientServices:
      readonly ClientServiceWithService[],
  ): ClientServiceResponseDto[] {
    return clientServices.map(
      (clientService) =>
        this.toResponse(clientService),
    );
  }
}