import { Injectable } from "@nestjs/common";

import type {
  SmppAccount,
  SmppAccountIpAllowlist,
} from "@prisma/client";

import {
  SmppAccountResponseDto,
} from "./dto/smpp-response.dto.js";

export type SmppAccountWithOptionalClient =
  SmppAccount & {
    client?: {
      id: string;
      publicId: string;
      companyName: string;
      displayName: string;
    };

    ipAllowlist?: Pick<
      SmppAccountIpAllowlist,
      "ipAddress"
    >[];
  };

@Injectable()
export class SmppAccountMapper {
  toResponse(
    account: SmppAccountWithOptionalClient,
  ): SmppAccountResponseDto {
    return {
      id: account.id,
      publicId: account.publicId,

      ...(account.client
        ? {
          client: {
            id:
              account.client.id,
            publicId:
              account.client.publicId,
            companyName:
              account.client.companyName,
            displayName:
              account.client.displayName,
          },
        }
        : {
          clientId:
            account.clientId,
        }),

      systemId:
        account.systemId,

      status:
        account.status,

      maxConcurrentBinds:
        account.maxConcurrentBinds,

      enquireLinkInterval:
        account.enquireLinkInterval,

      ipAllowlist:
        account.ipAllowlist?.map(
          (entry) =>
            entry.ipAddress,
        ) ?? [],

      createdAt:
        account.createdAt,

      updatedAt:
        account.updatedAt,
    };
  }

  toResponses(
    accounts: readonly SmppAccountWithOptionalClient[],
  ): SmppAccountResponseDto[] {
    return accounts.map(
      (account) =>
        this.toResponse(account),
    );
  }
}