import { PaymentProviderStatus } from "@prisma/client";

export class PaymentProviderResponseDto {
  id!: string;
  code!: string;
  name!: string;
  description!: string | null;
  status!: PaymentProviderStatus;
  metadata!: Record<string, unknown> | null;
  createdAt!: Date;
  updatedAt!: Date;
}