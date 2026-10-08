import { PaymentProvider } from "@prisma/client";

import { PaymentProviderResponseDto } from "../dto/payment-provider-response.dto.js";

export class PaymentProviderMapper {
  static toResponse(
    provider: PaymentProvider,
  ): PaymentProviderResponseDto {
    return {
      id: provider.id,
      code: provider.code,
      name: provider.name,
      description: provider.description,
      status: provider.status,
      metadata:
        provider.metadata as
        | Record<string, unknown>
        | null,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }

  static toResponseList(
    providers: readonly PaymentProvider[],
  ): PaymentProviderResponseDto[] {
    return providers.map(
      (provider) =>
        this.toResponse(provider),
    );
  }
}