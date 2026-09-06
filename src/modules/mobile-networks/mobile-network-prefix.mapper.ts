import { Injectable } from "@nestjs/common";

import type { MobileNetworkPrefix } from "@prisma/client";

import { MobileNetworkPrefixResponseDto } from "./dto/mobile-network.response.dto.js";

@Injectable()
export class MobileNetworkPrefixMapper {
  toResponse(prefix: MobileNetworkPrefix): MobileNetworkPrefixResponseDto {
    return {
      id: prefix.id,
      mobileNetworkId: prefix.mobileNetworkId,
      prefix: prefix.prefix,
      countryCode: prefix.countryCode,
      enabled: prefix.enabled,
      createdAt: prefix.createdAt,
      updatedAt: prefix.updatedAt,
    };
  }

  toResponses(prefixes: readonly MobileNetworkPrefix[]): MobileNetworkPrefixResponseDto[] {
    return prefixes.map((prefix) => this.toResponse(prefix));
  }
}
