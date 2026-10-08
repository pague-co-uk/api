import {
  ClientServiceStatus,
  ServiceCategory,
  ServiceStatus,
} from "@prisma/client";

export class ClientServiceResponseDto {
  id!: string;

  clientId!: string;

  serviceId!: string;

  serviceCode!: string;

  serviceName!: string;

  serviceCategory!: ServiceCategory;

  serviceStatus!: ServiceStatus;

  status!: ClientServiceStatus;

  configuration!: Record<
    string,
    unknown
  > | null;

  enabledAt!: Date | null;

  disabledAt!: Date | null;

  createdAt!: Date;

  updatedAt!: Date;
}