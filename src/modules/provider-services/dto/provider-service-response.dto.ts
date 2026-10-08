import {
  PaymentProviderStatus,
  ServiceCategory,
  ServiceStatus,
} from "@prisma/client";

export class ProviderServiceResponseDto {
  id!: string;

  providerId!: string;
  providerCode!: string;
  providerName!: string;
  providerStatus!: PaymentProviderStatus;

  serviceId!: string;
  serviceCode!: string;
  serviceName!: string;
  serviceCategory!: ServiceCategory;
  serviceStatus!: ServiceStatus;

  externalServiceCode!: string | null;
  configuration!: Record<string, unknown> | null;

  active!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}