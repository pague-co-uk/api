import type { ClientStatus } from "@prisma/client";

export interface ClientQueryOptions {
  readonly page: number;
  readonly pageSize: number;

  readonly search?: string;

  readonly status?: ClientStatus;
}