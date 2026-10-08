import { TransactionStatus } from "@prisma/client";

export class PaymentResponseDto {
  id!: string;
  status!: TransactionStatus;
}