import { Injectable } from "@nestjs/common";

import type { SmppAccount } from "@prisma/client";

import { SmppAccountResponseDto } from "./dto/smpp-response.dto.js";

@Injectable()
export class SmppAccountMapper {
  toResponse(
    account: SmppAccount,
  ): SmppAccountResponseDto {
    return {
      id: account.id,
      publicId: account.publicId,
      clientId: account.clientId,

      systemId: account.systemId,

      status: account.status,

      maxConcurrentBinds:
        account.maxConcurrentBinds,

      enquireLinkInterval:
        account.enquireLinkInterval,

      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  toResponses(
    accounts: readonly SmppAccount[],
  ): SmppAccountResponseDto[] {
    return accounts.map(
      (account) =>
        this.toResponse(account),
    );
  }
}