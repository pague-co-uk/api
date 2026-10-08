import type { DashboardScope } from "./dashboard.types.js";

export interface PaymentDashboardViewer {
  userId: string;
  scope: DashboardScope;
  clientId: string | null;
  clientName: string | null;
}

export interface PaymentDashboardPeriod {
  start: string;
  end: string;
  days: number;
}

export interface PaymentDashboardSummary {
  total: number;
  successful: number;
  failed: number;
  processing: number;
  pending: number;
  reversed: number;
  cancelled: number;
  successRate: number;
}

export interface PaymentTransactionTrendPoint {
  date: string;
  total: number;
  successful: number;
  failed: number;
}

export interface PaymentStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface PaymentCurrencyVolume {
  currencyId: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string | null;
  transactionCount: number;
  totalAmount: string;
}

export interface PaymentProviderPerformance {
  providerId: string | null;
  providerCode: string | null;
  providerName: string | null;
  transactionCount: number;
  successful: number;
  failed: number;
  successRate: number;
}

export interface PaymentTransactionTypeBreakdown {
  transactionTypeId: string;
  transactionTypeCode: string;
  transactionTypeName: string;
  transactionCount: number;
  successful: number;
  failed: number;
  successRate: number;
}

export interface PaymentDashboardTransaction {
  id: string;
  publicId: string;
  clientId: string;
  clientName: string;
  serviceCode: string;
  serviceName: string;
  providerCode: string | null;
  providerName: string | null;
  currencyCode: string;
  currencySymbol: string | null;
  transactionTypeCode: string;
  transactionTypeName: string;
  status: string;
  reference: string;
  amount: string;
  createdAt: string;
}

export interface PaymentDashboardData {
  viewer: PaymentDashboardViewer;
  period: PaymentDashboardPeriod;
  summary: PaymentDashboardSummary;
  transactionTrend: PaymentTransactionTrendPoint[];
  statusBreakdown: PaymentStatusBreakdown[];
  currencyVolume: PaymentCurrencyVolume[];
  providerPerformance: PaymentProviderPerformance[];
  transactionTypes: PaymentTransactionTypeBreakdown[];
  recentTransactions: PaymentDashboardTransaction[];
}