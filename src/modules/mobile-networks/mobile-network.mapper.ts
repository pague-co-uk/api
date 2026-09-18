import { Injectable } from "@nestjs/common";

import type { Prisma } from "@prisma/client";

import type { MobileNetworkResponseDto } from "./dto/mobile-network.response.dto.js";

type MobileNetworkWithCountry =
  Prisma.MobileNetworkGetPayload<{
    include: {
      country: true;
    };
  }>;

@Injectable()
export class MobileNetworkMapper {

  toResponse(
    network: MobileNetworkWithCountry,
  ): MobileNetworkResponseDto {

    return {

      id: network.id,

      publicId: network.publicId,

      name: network.name,

      code: network.code,

      countryCode:
        network.country.code,

      country: {

        code:
          network.country.code,

        name:
          network.country.name,

      },

      routingRegex:
        network.routingRegex,

      status:
        network.status,

      createdAt:
        network.createdAt,

      updatedAt:
        network.updatedAt,

    };

  }

  toResponses(
    networks:
      readonly MobileNetworkWithCountry[],
  ): MobileNetworkResponseDto[] {

    return networks.map(
      (network) =>
        this.toResponse(network),
    );

  }

}