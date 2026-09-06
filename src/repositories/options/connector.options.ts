import type { ConnectorStatus, ConnectorTransport } from "@prisma/client";

export interface ConnectorQueryOptions {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: ConnectorStatus;
  readonly transport?: ConnectorTransport;
  readonly provider?: string;
  readonly search?: string;
}
