export interface PaymentDataField {
  type: 'string' | 'number' | 'boolean' | 'object';
  required?: boolean;
  enum?: Array<string | number | boolean>;
  minLength?: number;
  maxLength?: number;
}

export interface PaymentServiceConfiguration {
  version?: 1 | 2;
  accountType?: 'mobile' | 'bank' | 'identifier';
  countries?: string[];
  dataFields?: Record<string, PaymentDataField>;

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
