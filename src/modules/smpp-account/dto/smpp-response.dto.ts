import { SmppAccountStatus } from "@prisma/client";

export class SmppAccountResponseDto {
  id!: string;
  publicId!: string;
  clientId!: string;

  systemId!: string;

  status!: SmppAccountStatus;

  maxConcurrentBinds!: number;
  enquireLinkInterval!: number;

  createdAt!: Date;
  updatedAt!: Date;
}