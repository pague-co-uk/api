import { Injectable } from "@nestjs/common";

import { RouteResponseDto } from "./dto/route.response.dto.js";

@Injectable()
export class RouteMapper {
  toResponse(route: any): RouteResponseDto {
    return {
      id: route.id,
      publicId: route.publicId,
      clientId: route.clientId,
      client: route.client
        ? {
          id: route.client.id,
          companyName: route.client.companyName,
          displayName: route.client.displayName,
        }
        : undefined,
      mobileNetworkId: route.mobileNetworkId,
      mobileNetwork: route.mobileNetwork
        ? {
          id: route.mobileNetwork.id,
          name: route.mobileNetwork.name,
          code: route.mobileNetwork.code,
          countryCode: route.mobileNetwork.countryCode,
          status: route.mobileNetwork.status,
        }
        : undefined,
      connectorId: route.connectorId,
      connector: route.connector
        ? {
          id: route.connector.id,
          name: route.connector.name,
          code: route.connector.code,
          provider: route.connector.provider,
          transport: route.connector.transport,
          status: route.connector.status,
        }
        : undefined,
      priority: route.priority,
      status: route.status,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
    };
  }

  toResponses(routes: readonly any[]): RouteResponseDto[] {
    return routes.map((route) => this.toResponse(route));
  }
}
