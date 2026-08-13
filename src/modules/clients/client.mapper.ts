import { Injectable } from "@nestjs/common";
import type { Client } from "@prisma/client";

import { ClientSummaryResponseDto } from "./dto/client-summary.response.dto.js";
import { ClientResponseDto } from "./dto/client.response.dto.js";

@Injectable()
export class ClientMapper {
  toResponse(
    client: Client,
  ): ClientResponseDto {
    return {
      publicId: client.publicId,
      companyName: client.companyName,
      displayName: client.displayName,
      email: client.email,
      phone: client.phone,
      status: client.status,
      rateLimitPerSecond:
        client.rateLimitPerSecond,
      timezone: client.timezone,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  toSummary(
    client: Client,
  ): ClientSummaryResponseDto {
    return {
      publicId: client.publicId,
      companyName: client.companyName,
      displayName: client.displayName,
      email: client.email,
      status: client.status,
      createdAt: client.createdAt,
    };
  }

  toSummaries(
    clients: readonly Client[],
  ): ClientSummaryResponseDto[] {
    return clients.map((client) =>
      this.toSummary(client),
    );
  }
}