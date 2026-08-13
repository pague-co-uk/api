import { SenderIdStatus } from "@prisma/client";


export interface SenderIdQueryOptions {
  readonly clientId?: string;
  readonly status?: SenderIdStatus;
  readonly sender?: string;
  readonly search?: string;
  readonly isDefault?: boolean;
  readonly page: number;
  readonly pageSize: number;

}