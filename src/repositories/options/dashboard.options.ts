export type DashboardPeriod = "7d" | "30d" | "90d";

export interface DashboardQueryOptions {
  period: DashboardPeriod;
}

export interface DashboardDateRange {
  start: Date;
  end: Date;
}