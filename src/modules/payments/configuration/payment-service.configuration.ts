export interface PaymentServiceConfiguration {
  requiredFields: string[];

  validation: {
    limits: {
      minimumAmount?: string;
      maximumAmount?: string;
    };

    currencies: string[];

    transactionTypes: string[];
  };
}