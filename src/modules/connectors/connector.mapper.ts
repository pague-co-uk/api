import { Injectable } from "@nestjs/common";

import { ConnectorResponseDto } from "./dto/connector.response.dto.js";

@Injectable()
export class ConnectorMapper {
  toResponse(connector: any): ConnectorResponseDto {
    return {
      id: connector.id,
      publicId: connector.publicId,
      name: connector.name,
      code: connector.code,
      provider: connector.provider,
      transport: connector.transport,
      status: connector.status,
      configuration: connector.configuration ?? undefined,
      createdAt: connector.createdAt,
      updatedAt: connector.updatedAt,
    };
  }

  toResponses(connectors: readonly any[]): ConnectorResponseDto[] {
    return connectors.map((connector) => this.toResponse(connector));
  }
}
