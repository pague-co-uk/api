import type { MobileNetworkStatus } from "@prisma/client";

export interface MobileNetworkQueryOptions {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: MobileNetworkStatus;
  readonly countryCode?: string;
  readonly search?: string;
}
