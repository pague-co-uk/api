import { TransactionStatus } from "@prisma/client";

export class PaymentResponseDto {
  id!: string;
  status!: TransactionStatus;
  checkout?: { merchantTransactionId: string; checkoutReference: string; redirectUrl: string; expiresAt: string };
}