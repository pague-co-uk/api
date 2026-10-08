export class CurrencyResponseDto {
  id!: string;
  code!: string;
  numericCode!: string | null;
  name!: string;
  symbol!: string | null;
  decimalDigits!: number;
  active!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}