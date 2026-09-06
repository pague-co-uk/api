import { Injectable } from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { Prisma, RouteStatus } from "@prisma/client";

import { AuditService } from "../../../audit/index.js";
import type { Page } from "../../../common/query/page.interface.js";
import { ClientNotFoundException } from "../../../exceptions/entity/clients.exceptions.js";
import { ConnectorNotFoundException } from "../../../exceptions/entity/connectors.exceptions.js";
import { MobileNetworkNotFoundException } from "../../../exceptions/entity/mobile-networks.exceptions.js";
import { RouteAlreadyExistsException, RouteNotFoundException } from "../../../exceptions/entity/routes.exceptions.js";
import { ClientRepository } from "../../../repositories/ClientRepository.js";
import { ConnectorRepository } from "../../../repositories/ConnectorRepository.js";
import { MobileNetworkRepository } from "../../../repositories/MobileNetworkRepository.js";
import { RouteRepository, RouteWithRelations } from "../../../repositories/RouteRepository.js";
import type { RouteQueryOptions } from "../../../repositories/options/route.options.js";
import { CreateRouteDto } from "../dto/create-route.dto.js";
import { UpdateRouteDto } from "../dto/update-route.dto.js";

@Injectable()
export class RouteService {
  private readonly logger = getComponentLogger("RouteService");

  constructor(
    private readonly routes: RouteRepository,
    private readonly clients: ClientRepository,
    private readonly mobileNetworks: MobileNetworkRepository,
    private readonly connectors: ConnectorRepository,
    private readonly audit: AuditService,
  ) { }

  private readonly routesCreatedCounter = createCounterMetric({ name: "routes.created", description: "Number of routes created." });
  private readonly routesUpdatedCounter = createCounterMetric({ name: "routes.updated", description: "Number of routes updated." });
  private readonly routesDeletedCounter = createCounterMetric({ name: "routes.deleted", description: "Number of routes deleted." });

  async findById(id: string): Promise<RouteWithRelations> {
    return withSpan("RouteService.findById", async (span) => {
      this.logger.debug({ routeId: id }, "Retrieving route.");
      span.setAttribute("route.id", id);

      try {
        return await this.findEntityOrThrow(id);
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, routeId: id }, "Failed to retrieve route.");
        throw error;
      }
    });
  }

  async findMany(query: RouteQueryOptions): Promise<Page<RouteWithRelations>> {
    return withSpan("RouteService.findMany", async (span) => {
      this.logger.debug({ query }, "Retrieving routes.");

      try {
        const page = await this.routes.findMany(query);
        span.setAttribute("routes.count", page.items.length);
        span.setAttribute("routes.total", page.totalItems);
        this.logger.debug({ count: page.items.length, total: page.totalItems }, "Routes retrieved successfully.");
        return page;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, query }, "Failed to retrieve routes.");
        throw error;
      }
    });
  }

  async create(dto: CreateRouteDto): Promise<RouteWithRelations> {
    return withSpan("RouteService.create", async (span) => {
      this.logger.info({ publicId: dto.publicId, clientId: dto.clientId, mobileNetworkId: dto.mobileNetworkId }, "Creating route.");
      span.setAttribute("route.public_id", dto.publicId);
      span.setAttribute("route.client_id", dto.clientId);
      span.setAttribute("route.mobile_network_id", dto.mobileNetworkId);

      try {
        const client = await this.clients.findById(dto.clientId);
        if (!client) throw new ClientNotFoundException(dto.clientId);

        const network = await this.mobileNetworks.findById(dto.mobileNetworkId);
        if (!network) throw new MobileNetworkNotFoundException(dto.mobileNetworkId);

        const connector = await this.connectors.findById(dto.connectorId);
        if (!connector) throw new ConnectorNotFoundException(dto.connectorId);

        const existing = await this.routes.findByClientAndNetworkAndPriority(dto.clientId, dto.mobileNetworkId, dto.priority);
        if (existing) throw new RouteAlreadyExistsException(dto.clientId, dto.mobileNetworkId, dto.priority);

        const route = await this.routes.create({
          publicId: dto.publicId,
          client: { connect: { id: dto.clientId } },
          mobileNetwork: { connect: { id: dto.mobileNetworkId } },
          connector: { connect: { id: dto.connectorId } },
          priority: dto.priority,
          status: RouteStatus.ACTIVE,
        });

        this.routesCreatedCounter.add(1);

        await this.audit.record({
          action: "route.created",
          resourceType: "Route",
          resourceId: route.id,
          metadata: {
            publicId: route.publicId,
            clientId: route.clientId,
            mobileNetworkId: route.mobileNetworkId,
            connectorId: route.connectorId,
            priority: route.priority,
            status: route.status,
          },
        });

        this.logger.info({ routeId: route.id }, "Route created successfully.");

        if (typeof this.routes.findById === "function") {
          const refreshed = await this.routes.findById(route.id);
          if (refreshed) return refreshed;
        }

        return route;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, publicId: dto.publicId }, "Failed to create route.");
        throw error;
      }
    });
  }

  async update(id: string, dto: UpdateRouteDto): Promise<RouteWithRelations> {
    return withSpan("RouteService.update", async (span) => {
      this.logger.info({ routeId: id }, "Updating route.");
      span.setAttribute("route.id", id);

      try {
        const existing = await this.findEntityOrThrow(id);
        const update: Prisma.RouteUpdateInput = {};

        if (dto.clientId !== undefined) {
          const client = await this.clients.findById(dto.clientId);
          if (!client) throw new ClientNotFoundException(dto.clientId);
          update.client = { connect: { id: dto.clientId } };
        }

        if (dto.mobileNetworkId !== undefined) {
          const network = await this.mobileNetworks.findById(dto.mobileNetworkId);
          if (!network) throw new MobileNetworkNotFoundException(dto.mobileNetworkId);
          update.mobileNetwork = { connect: { id: dto.mobileNetworkId } };
        }

        if (dto.connectorId !== undefined) {
          const connector = await this.connectors.findById(dto.connectorId);
          if (!connector) throw new ConnectorNotFoundException(dto.connectorId);
          update.connector = { connect: { id: dto.connectorId } };
        }

        if (dto.priority !== undefined) {
          if (dto.clientId === undefined && dto.mobileNetworkId === undefined) {
            const resolvedClientId = dto.clientId ?? existing.clientId;
            const resolvedNetworkId = dto.mobileNetworkId ?? existing.mobileNetworkId;
            const duplicate = await this.routes.findByClientAndNetworkAndPriority(resolvedClientId, resolvedNetworkId, dto.priority);
            if (duplicate && duplicate.id !== id) throw new RouteAlreadyExistsException(resolvedClientId, resolvedNetworkId, dto.priority);
          } else {
            const clientId = dto.clientId ?? existing.clientId;
            const mobileNetworkId = dto.mobileNetworkId ?? existing.mobileNetworkId;
            const duplicate = await this.routes.findByClientAndNetworkAndPriority(clientId, mobileNetworkId, dto.priority);
            if (duplicate && duplicate.id !== id) throw new RouteAlreadyExistsException(clientId, mobileNetworkId, dto.priority);
          }
          update.priority = dto.priority;
        }

        const route = await this.routes.update(id, update);
        this.routesUpdatedCounter.add(1);

        await this.audit.record({
          action: "route.updated",
          resourceType: "Route",
          resourceId: route.id,
          metadata: {
            publicId: route.publicId,
            previousPriority: existing.priority,
            updatedPriority: route.priority,
          },
        });

        this.logger.info({ routeId: route.id }, "Route updated successfully.");
        return route;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, routeId: id }, "Failed to update route.");
        throw error;
      }
    });
  }

  async delete(id: string): Promise<void> {
    return withSpan("RouteService.delete", async (span) => {
      this.logger.info({ routeId: id }, "Deleting route.");
      span.setAttribute("route.id", id);

      try {
        const route = await this.findEntityOrThrow(id);
        await this.routes.delete(id);
        this.routesDeletedCounter.add(1);

        await this.audit.record({
          action: "route.deleted",
          resourceType: "Route",
          resourceId: route.id,
          metadata: {
            publicId: route.publicId,
            clientId: route.clientId,
            mobileNetworkId: route.mobileNetworkId,
          },
        });

        this.logger.info({ routeId: id }, "Route deleted successfully.");
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, routeId: id }, "Failed to delete route.");
        throw error;
      }
    });
  }

  async enable(id: string): Promise<RouteWithRelations> {
    return this.updateStatus(id, RouteStatus.ACTIVE);
  }

  async disable(id: string): Promise<RouteWithRelations> {
    return this.updateStatus(id, RouteStatus.DISABLED);
  }

  private async updateStatus(id: string, status: RouteStatus): Promise<RouteWithRelations> {
    return withSpan("RouteService.updateStatus", async (span) => {
      this.logger.info({ routeId: id, status }, "Updating route status.");
      span.setAttribute("route.id", id);
      span.setAttribute("route.status", status);

      try {
        const existing = await this.findEntityOrThrow(id);
        if (existing.status === status) return existing;

        const route = await this.routes.update(id, { status });
        await this.audit.record({
          action: status === RouteStatus.ACTIVE ? "route.enabled" : "route.disabled",
          resourceType: "Route",
          resourceId: route.id,
          metadata: {
            publicId: route.publicId,
            previousStatus: existing.status,
            status: route.status,
          },
        });

        this.logger.info({ routeId: route.id, previousStatus: existing.status, status: route.status }, "Route status updated successfully.");
        return route;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, routeId: id, status }, "Failed to update route status.");
        throw error;
      }
    });
  }

  private async findEntityOrThrow(id: string): Promise<RouteWithRelations> {
    const route = await this.routes.findById(id);

    if (!route) {
      throw new RouteNotFoundException(id);
    }

    return route;
  }
}
