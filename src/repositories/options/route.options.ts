import type { RouteStatus } from "@prisma/client";

export interface RouteQueryOptions {
  readonly page: number;
  readonly pageSize: number;
  readonly clientId?: string;
  readonly mobileNetworkId?: string;
  readonly connectorId?: string;
  readonly status?: RouteStatus;
  readonly search?: string;
}
