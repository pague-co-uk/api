import {
  ServiceCategory,
  ServiceStatus,
} from '@prisma/client';

export class ServiceResponseDto {
  id!: string;

  code!: string;

  name!: string;

  description!: string | null;

  category!: ServiceCategory;

  status!: ServiceStatus;

  metadata!: Record<string, unknown> | null;

  createdAt!: Date;

  updatedAt!: Date;
}