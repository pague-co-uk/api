import type {
  ClientStatus,
  MessageStatus,
} from "@prisma/client";

export type DashboardScope =
  | "PLATFORM"
  | "CLIENT";

export interface DashboardViewer {
  userId: string;
  scope: DashboardScope;
  clientId: string | null;
  clientName: string | null;
}

export interface DashboardPeriod {
  start: Date;
  end: Date;
  days: number;
}

export interface DashboardMessageSummary {
  total: number;
  queued: number;
  routed: number;
  submitted: number;
  delivered: number;
  failed: number;
  expired: number;
  deliveryRate: number;
}

export interface DashboardTrendPoint {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
  expired: number;
}

export interface DashboardStatusBreakdown {
  status: MessageStatus;
  count: number;
  percentage: number;
}

export interface DashboardRoutePerformance {
  publicId: string;
  connectorName: string;
  attempts: number;
  submitted: number;
  delivered: number;
  failed: number;
  submissionRate: number;
  deliveryRate: number;
}

export interface DashboardKpiSummary {
  readonly totalMessages: number;
  readonly delivered: number;
  readonly failed: number;
  readonly deliveryRate: number;
  readonly fifthMetric: {
    readonly label: string;
    readonly value: number;
    readonly formattedValue: string;
  };
}

export interface DashboardFloatSummary {
  balance: number;
  currency: string;
  topUps: number;
  debits: number;
  refunds: number;
  adjustments: number;
}

export interface DashboardFloatTrendPoint {
  date: string;
  topUps: number;
  debits: number;
  refunds: number;
  adjustments: number;
  net: number;
}

export interface DashboardOperationalSummary {
  scope: DashboardScope;

  clients: {
    active: number;
    suspended: number;
    disabled: number;
  };

  smppAccounts: {
    active: number;
    suspended: number;
    disabled: number;
  };

  senderIds: {
    pending: number;
    approved: number;
    rejected: number;
    disabled: number;
  };

  webhooks: {
    active: number;
    disabled: number;
  };
}

export interface DashboardClientSummary {
  clientId: string;
  publicId: string;
  name: string;
  status: ClientStatus;
  messages: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
}

export interface DashboardActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  clientId: string | null;
  clientName: string | null;
  userId: string | null;
  userName: string | null;
  createdAt: Date;
}

export interface DashboardData {
  viewer: DashboardViewer;

  period: {
    start: string;
    end: string;
    days: number;
  };

  readonly kpis: DashboardKpiSummary;

  messages: DashboardMessageSummary;

  messageTrend: DashboardTrendPoint[];

  hourlyVolume: DashboardHourlyVolume[];

  statusBreakdown: DashboardStatusBreakdown[];

  statusCodeBreakdown: DashboardStatusCodeBreakdown[];

  routePerformance: DashboardRoutePerformance[];

  float: DashboardFloatSummary;

  floatTrend: DashboardFloatTrendPoint[];

  operational: DashboardOperationalSummary;

  clients: DashboardClientSummary[];

  recentActivity: DashboardActivityItem[];
}

export interface DashboardHourlyVolume {
  day: number;
  hour: number;
  count: number;
}

export interface DashboardStatusCodeBreakdown {
  code: string;
  label: string;
  count: number;
  percentage: number;
}