import { Injectable } from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { ConnectorStatus, Prisma } from "@prisma/client";

import { AuditService } from "../../../audit/index.js";
import type { Page } from "../../../common/query/page.interface.js";
import { ConnectorAlreadyExistsException, ConnectorNotFoundException } from "../../../exceptions/entity/connectors.exceptions.js";
import { ConnectorRepository } from "../../../repositories/ConnectorRepository.js";
import type { ConnectorQueryOptions } from "../../../repositories/options/connector.options.js";
import { CreateConnectorDto } from "../dto/create-connector.dto.js";
import { UpdateConnectorDto } from "../dto/update-connector.dto.js";

@Injectable()
export class ConnectorService {
  private readonly logger = getComponentLogger("ConnectorService");

  constructor(
    private readonly connectors: ConnectorRepository,
    private readonly audit: AuditService,
  ) { }

  private readonly connectorsCreatedCounter = createCounterMetric({
    name: "connectors.created",
    description: "Number of connectors created.",
  });

  private readonly connectorsUpdatedCounter = createCounterMetric({
    name: "connectors.updated",
    description: "Number of connectors updated.",
  });

  private readonly connectorsDeletedCounter = createCounterMetric({
    name: "connectors.deleted",
    description: "Number of connectors deleted.",
  });

  async findById(id: string) {
    return withSpan("ConnectorService.findById", async (span) => {
      this.logger.debug({ connectorId: id }, "Retrieving connector.");
      span.setAttribute("connector.id", id);

      try {
        return await this.findEntityOrThrow(id);
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, connectorId: id }, "Failed to retrieve connector.");
        throw error;
      }
    });
  }

  async findMany(query: ConnectorQueryOptions): Promise<Page<any>> {
    return withSpan("ConnectorService.findMany", async (span) => {
      this.logger.debug({ query }, "Retrieving connectors.");

      try {
        const page = await this.connectors.findMany(query);
        span.setAttribute("connectors.count", page.items.length);
        span.setAttribute("connectors.total", page.totalItems);
        this.logger.debug({ count: page.items.length, total: page.totalItems }, "Connectors retrieved successfully.");
        return page;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, query }, "Failed to retrieve connectors.");
        throw error;
      }
    });
  }

  async create(dto: CreateConnectorDto) {
    return withSpan("ConnectorService.create", async (span) => {
      this.logger.info({ publicId: dto.publicId, code: dto.code }, "Creating connector.");
      span.setAttribute("connector.public_id", dto.publicId);
      span.setAttribute("connector.code", dto.code);

      try {
        await this.ensureCodeAvailable(dto.code);

        const connector = await this.connectors.create({
          publicId: dto.publicId,
          name: dto.name,
          code: dto.code,
          provider: dto.provider,
          transport: dto.transport,
          status: ConnectorStatus.ACTIVE,
          configuration: (dto.configuration ?? undefined) as Prisma.InputJsonValue | undefined,
        });

        this.connectorsCreatedCounter.add(1);

        await this.audit.record({
          action: "connector.created",
          resourceType: "Connector",
          resourceId: connector.id,
          metadata: {
            publicId: connector.publicId,
            code: connector.code,
            provider: connector.provider,
            transport: connector.transport,
            status: connector.status,
          },
        });

        this.logger.info({ connectorId: connector.id }, "Connector created successfully.");

        if (typeof this.connectors.findById === "function") {
          const refreshed = await this.connectors.findById(connector.id);
          if (refreshed) return refreshed;
        }

        return connector;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, publicId: dto.publicId, code: dto.code }, "Failed to create connector.");
        throw error;
      }
    });
  }

  async update(id: string, dto: UpdateConnectorDto) {
    return withSpan("ConnectorService.update", async (span) => {
      this.logger.info({ connectorId: id }, "Updating connector.");
      span.setAttribute("connector.id", id);

      try {
        const existing = await this.findEntityOrThrow(id);
        const update: Prisma.ConnectorUpdateInput = {};

        if (dto.name !== undefined) update.name = dto.name;
        if (dto.code !== undefined) update.code = dto.code;
        if (dto.provider !== undefined) update.provider = dto.provider;
        if (dto.transport !== undefined) update.transport = dto.transport;
        if (dto.configuration !== undefined) update.configuration = dto.configuration as Prisma.InputJsonValue;

        if (dto.code !== undefined && dto.code !== existing.code) {
          await this.ensureCodeAvailable(dto.code, id);
        }

        const connector = await this.connectors.update(id, update);

        this.connectorsUpdatedCounter.add(1);

        await this.audit.record({
          action: "connector.updated",
          resourceType: "Connector",
          resourceId: connector.id,
          metadata: {
            publicId: connector.publicId,
            previousCode: existing.code,
            updatedCode: connector.code,
          },
        });

        this.logger.info({ connectorId: connector.id }, "Connector updated successfully.");
        return connector;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, connectorId: id }, "Failed to update connector.");
        throw error;
      }
    });
  }

  async delete(id: string): Promise<void> {
    return withSpan("ConnectorService.delete", async (span) => {
      this.logger.info({ connectorId: id }, "Deleting connector.");
      span.setAttribute("connector.id", id);

      try {
        const connector = await this.findEntityOrThrow(id);
        await this.connectors.delete(id);
        this.connectorsDeletedCounter.add(1);

        await this.audit.record({
          action: "connector.deleted",
          resourceType: "Connector",
          resourceId: connector.id,
          metadata: {
            publicId: connector.publicId,
            code: connector.code,
          },
        });

        this.logger.info({ connectorId: id }, "Connector deleted successfully.");
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, connectorId: id }, "Failed to delete connector.");
        throw error;
      }
    });
  }

  async enable(id: string) {
    return this.updateStatus(id, ConnectorStatus.ACTIVE);
  }

  async disable(id: string) {
    return this.updateStatus(id, ConnectorStatus.DISABLED);
  }

  async suspend(id: string) {
    return this.updateStatus(id, ConnectorStatus.SUSPENDED);
  }

  private async updateStatus(id: string, status: ConnectorStatus) {
    return withSpan("ConnectorService.updateStatus", async (span) => {
      this.logger.info({ connectorId: id, status }, "Updating connector status.");
      span.setAttribute("connector.id", id);
      span.setAttribute("connector.status", status);

      try {
        const existing = await this.findEntityOrThrow(id);
        if (existing.status === status) return existing;

        const connector = await this.connectors.update(id, { status });
        await this.audit.record({
          action: status === ConnectorStatus.ACTIVE ? "connector.enabled" : status === ConnectorStatus.SUSPENDED ? "connector.suspended" : "connector.disabled",
          resourceType: "Connector",
          resourceId: connector.id,
          metadata: {
            publicId: connector.publicId,
            previousStatus: existing.status,
            status: connector.status,
          },
        });

        this.logger.info({ connectorId: connector.id, previousStatus: existing.status, status: connector.status }, "Connector status updated successfully.");
        return connector;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, connectorId: id, status }, "Failed to update connector status.");
        throw error;
      }
    });
  }

  private async ensureCodeAvailable(code: string, excludeId?: string): Promise<void> {
    const existing = await this.connectors.findByCode(code);

    if (existing && existing.id !== excludeId) {
      throw new ConnectorAlreadyExistsException(code);
    }
  }

  private async findEntityOrThrow(id: string) {
    const connector = await this.connectors.findById(id);

    if (!connector) {
      throw new ConnectorNotFoundException(id);
    }

    return connector;
  }
}
