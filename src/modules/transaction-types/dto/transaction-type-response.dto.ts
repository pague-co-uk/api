
export class TransactionTypeResponseDto {
  id!: string;
  code!: string;
  name!: string;
  description!: string | null;
  active!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}