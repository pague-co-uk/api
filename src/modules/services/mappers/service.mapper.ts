import { Service } from '@prisma/client';
import { ServiceResponseDto } from '../dto/service-response.dto.js';

export class ServiceMapper {
  static toResponse(service: Service): ServiceResponseDto {
    return {
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description,
      category: service.category,
      status: service.status,
      metadata: service.metadata as Record<string, unknown> | null,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  static toResponseList(
    services: readonly Service[],
  ): ServiceResponseDto[] {
    return services.map(
      (service) => this.toResponse(service),
    );
  }
}