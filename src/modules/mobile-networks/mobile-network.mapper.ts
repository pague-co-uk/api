import { Injectable } from "@nestjs/common";

import type { MobileNetworkPrefix } from "@prisma/client";

import type { MobileNetworkWithPrefixes } from "../../repositories/MobileNetworkRepository.js";
import { MobileNetworkPrefixResponseDto, MobileNetworkResponseDto } from "./dto/mobile-network.response.dto.js";

@Injectable()
export class MobileNetworkMapper {
  toResponse(network: MobileNetworkWithPrefixes): MobileNetworkResponseDto {
    return {
      id: network.id,
      publicId: network.publicId,
      name: network.name,
      code: network.code,
      countryCode: network.countryCode,
      status: network.status,
      prefixes: network.prefixes.map((prefix) => ({
        id: prefix.id,
        mobileNetworkId: prefix.mobileNetworkId,
        prefix: prefix.prefix,
        countryCode: prefix.countryCode,
        enabled: prefix.enabled,
        createdAt: prefix.createdAt,
        updatedAt: prefix.updatedAt,
      })),
      createdAt: network.createdAt,
      updatedAt: network.updatedAt,
    };
  }

  toResponses(networks: readonly MobileNetworkWithPrefixes[]): MobileNetworkResponseDto[] {
    return networks.map((network) => this.toResponse(network));
  }

  toPrefixResponse(prefix: MobileNetworkPrefix): MobileNetworkPrefixResponseDto {
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

  toPrefixResponses(prefixes: readonly MobileNetworkPrefix[]): MobileNetworkPrefixResponseDto[] {
    return prefixes.map((prefix) => this.toPrefixResponse(prefix));
  }
}
