import { Injectable } from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { MobileNetworkStatus, Prisma } from "@prisma/client";

import { AuditService } from "../../../audit/index.js";
import type { Page } from "../../../common/query/page.interface.js";
import { MobileNetworkAlreadyExistsException, MobileNetworkNotFoundException } from "../../../exceptions/entity/mobile-networks.exceptions.js";
import { MobileNetworkRepository, MobileNetworkWithPrefixes } from "../../../repositories/MobileNetworkRepository.js";
import type { MobileNetworkQueryOptions } from "../../../repositories/options/mobile-network.options.js";
import { CreateMobileNetworkPrefixDto } from "../dto/create-mobile-network-prefix.dto.js";
import { CreateMobileNetworkDto } from "../dto/create-mobile-network.dto.js";
import { UpdateMobileNetworkPrefixDto } from "../dto/update-mobile-network-prefix.dto.js";
import { UpdateMobileNetworkDto } from "../dto/update-mobile-network.dto.js";

@Injectable()
export class MobileNetworkService {
  private readonly logger = getComponentLogger("MobileNetworkService");

  constructor(
    private readonly mobileNetworks: MobileNetworkRepository,
    private readonly audit: AuditService,
  ) { }

  private readonly mobileNetworksCreatedCounter = createCounterMetric({
    name: "mobile_networks.created",
    description: "Number of mobile networks created.",
  });

  private readonly mobileNetworksUpdatedCounter = createCounterMetric({
    name: "mobile_networks.updated",
    description: "Number of mobile networks updated.",
  });

  private readonly mobileNetworksDeletedCounter = createCounterMetric({
    name: "mobile_networks.deleted",
    description: "Number of mobile networks deleted.",
  });

  private readonly mobileNetworkPrefixesCreatedCounter = createCounterMetric({
    name: "mobile_network_prefixes.created",
    description: "Number of mobile network prefixes created.",
  });

  private readonly mobileNetworkPrefixesUpdatedCounter = createCounterMetric({
    name: "mobile_network_prefixes.updated",
    description: "Number of mobile network prefixes updated.",
  });

  private readonly mobileNetworkPrefixesDeletedCounter = createCounterMetric({
    name: "mobile_network_prefixes.deleted",
    description: "Number of mobile network prefixes deleted.",
  });

  private readonly mobileNetworkPrefixesEnabledCounter = createCounterMetric({
    name: "mobile_network_prefixes.enabled",
    description: "Number of mobile network prefixes enabled.",
  });

  private readonly mobileNetworkPrefixesDisabledCounter = createCounterMetric({
    name: "mobile_network_prefixes.disabled",
    description: "Number of mobile network prefixes disabled.",
  });

  async findById(id: string): Promise<MobileNetworkWithPrefixes> {
    return withSpan("MobileNetworkService.findById", async (span) => {
      this.logger.debug({ mobileNetworkId: id }, "Retrieving mobile network.");
      span.setAttribute("mobile_network.id", id);

      try {
        return await this.findEntityOrThrow(id);
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, mobileNetworkId: id }, "Failed to retrieve mobile network.");
        throw error;
      }
    });
  }

  async findByPublicId(publicId: string): Promise<MobileNetworkWithPrefixes> {
    return withSpan("MobileNetworkService.findByPublicId", async (span) => {
      this.logger.debug({ publicId }, "Retrieving mobile network by public identifier.");
      span.setAttribute("mobile_network.public_id", publicId);

      try {
        const network = await this.mobileNetworks.findByPublicId(publicId);

        if (!network) {
          throw new MobileNetworkNotFoundException(publicId);
        }

        const found = await this.mobileNetworks.findById(network.id);

        if (!found) {
          throw new MobileNetworkNotFoundException(publicId);
        }

        return found;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, publicId }, "Failed to retrieve mobile network by public identifier.");
        throw error;
      }
    });
  }

  async findMany(query: MobileNetworkQueryOptions): Promise<Page<MobileNetworkWithPrefixes>> {
    return withSpan("MobileNetworkService.findMany", async (span) => {
      this.logger.debug({ query }, "Retrieving mobile networks.");

      try {
        const page = await this.mobileNetworks.findMany(query);
        span.setAttribute("mobile_networks.count", page.items.length);
        span.setAttribute("mobile_networks.total", page.totalItems);
        this.logger.debug({ count: page.items.length, total: page.totalItems }, "Mobile networks retrieved successfully.");
        return page;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, query }, "Failed to retrieve mobile networks.");
        throw error;
      }
    });
  }

  async create(dto: CreateMobileNetworkDto): Promise<MobileNetworkWithPrefixes> {
    return withSpan("MobileNetworkService.create", async (span) => {
      this.logger.info({ publicId: dto.publicId, code: dto.code }, "Creating mobile network.");
      span.setAttribute("mobile_network.public_id", dto.publicId);
      span.setAttribute("mobile_network.code", dto.code);

      try {
        await this.ensureCodeAvailable(dto.code);

        const network = await this.mobileNetworks.create({
          publicId: dto.publicId,
          name: dto.name,
          code: dto.code,
          countryCode: dto.countryCode,
          status: MobileNetworkStatus.ACTIVE,
        });

        this.mobileNetworksCreatedCounter.add(1);

        await this.audit.record({
          action: "mobile_network.created",
          resourceType: "MobileNetwork",
          resourceId: network.id,
          metadata: {
            publicId: network.publicId,
            code: network.code,
            countryCode: network.countryCode,
            status: network.status,
          },
        });

        this.logger.info({ mobileNetworkId: network.id }, "Mobile network created successfully.");

        if (typeof this.mobileNetworks.findById === "function") {
          const refreshed = await this.mobileNetworks.findById(network.id);
          if (refreshed) {
            return refreshed;
          }
        }

        return { ...network, prefixes: [] };
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, publicId: dto.publicId, code: dto.code }, "Failed to create mobile network.");
        throw error;
      }
    });
  }

  async update(id: string, dto: UpdateMobileNetworkDto): Promise<MobileNetworkWithPrefixes> {
    return withSpan("MobileNetworkService.update", async (span) => {
      this.logger.info({ mobileNetworkId: id }, "Updating mobile network.");
      span.setAttribute("mobile_network.id", id);

      try {
        const existing = await this.findEntityOrThrow(id);

        const update: Prisma.MobileNetworkUpdateInput = {};

        if (dto.name !== undefined) update.name = dto.name;
        if (dto.code !== undefined) update.code = dto.code;
        if (dto.countryCode !== undefined) update.countryCode = dto.countryCode;

        if (dto.code !== undefined && dto.code !== existing.code) {
          await this.ensureCodeAvailable(dto.code, id);
        }

        const network = await this.mobileNetworks.update(id, update);

        this.mobileNetworksUpdatedCounter.add(1);

        await this.audit.record({
          action: "mobile_network.updated",
          resourceType: "MobileNetwork",
          resourceId: network.id,
          metadata: {
            publicId: network.publicId,
            previousCode: existing.code,
            updatedCode: network.code,
            previousCountryCode: existing.countryCode,
            updatedCountryCode: network.countryCode,
          },
        });

        this.logger.info({ mobileNetworkId: network.id }, "Mobile network updated successfully.");
        return network;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, mobileNetworkId: id }, "Failed to update mobile network.");
        throw error;
      }
    });
  }

  async delete(id: string): Promise<void> {
    return withSpan("MobileNetworkService.delete", async (span) => {
      this.logger.info({ mobileNetworkId: id }, "Deleting mobile network.");
      span.setAttribute("mobile_network.id", id);

      try {
        const network = await this.findEntityOrThrow(id);
        await this.mobileNetworks.delete(id);
        this.mobileNetworksDeletedCounter.add(1);

        await this.audit.record({
          action: "mobile_network.deleted",
          resourceType: "MobileNetwork",
          resourceId: network.id,
          metadata: {
            publicId: network.publicId,
            code: network.code,
          },
        });

        this.logger.info({ mobileNetworkId: id }, "Mobile network deleted successfully.");
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, mobileNetworkId: id }, "Failed to delete mobile network.");
        throw error;
      }
    });
  }

  async enable(id: string): Promise<MobileNetworkWithPrefixes> {
    return this.updateStatus(id, MobileNetworkStatus.ACTIVE);
  }

  async disable(id: string): Promise<MobileNetworkWithPrefixes> {
    return this.updateStatus(id, MobileNetworkStatus.DISABLED);
  }

  private async updateStatus(id: string, status: MobileNetworkStatus): Promise<MobileNetworkWithPrefixes> {
    return withSpan("MobileNetworkService.updateStatus", async (span) => {
      this.logger.info({ mobileNetworkId: id, status }, "Updating mobile network status.");
      span.setAttribute("mobile_network.id", id);
      span.setAttribute("mobile_network.status", status);

      try {
        const existing = await this.findEntityOrThrow(id);
        if (existing.status === status) return existing;

        const network = await this.mobileNetworks.update(id, { status });
        await this.audit.record({
          action: status === MobileNetworkStatus.ACTIVE ? "mobile_network.enabled" : "mobile_network.disabled",
          resourceType: "MobileNetwork",
          resourceId: network.id,
          metadata: {
            publicId: network.publicId,
            previousStatus: existing.status,
            status: network.status,
          },
        });

        this.logger.info({ mobileNetworkId: network.id, previousStatus: existing.status, status: network.status }, "Mobile network status updated successfully.");
        return network;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, mobileNetworkId: id, status }, "Failed to update mobile network status.");
        throw error;
      }
    });
  }

  async findManyPrefixes(mobileNetworkId: string, query: { page: number; pageSize: number }): Promise<Page<any>> {
    return withSpan("MobileNetworkService.findManyPrefixes", async (span) => {
      this.logger.debug({ mobileNetworkId, query }, "Retrieving mobile network prefixes.");
      span.setAttribute("mobile_network.id", mobileNetworkId);

      try {
        await this.findEntityOrThrow(mobileNetworkId);
        const page = await this.mobileNetworks.findPrefixesByNetwork(mobileNetworkId, query);
        span.setAttribute("mobile_network_prefixes.count", page.items.length);
        span.setAttribute("mobile_network_prefixes.total", page.totalItems);
        this.logger.debug({ count: page.items.length, total: page.totalItems }, "Mobile network prefixes retrieved successfully.");
        return page;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, mobileNetworkId, query }, "Failed to retrieve mobile network prefixes.");
        throw error;
      }
    });
  }

  async findPrefixById(mobileNetworkId: string, prefixId: string) {
    return withSpan("MobileNetworkService.findPrefixById", async (span) => {
      this.logger.debug({ mobileNetworkId, prefixId }, "Retrieving mobile network prefix.");
      span.setAttribute("mobile_network.id", mobileNetworkId);
      span.setAttribute("mobile_network_prefix.id", prefixId);

      try {
        await this.findEntityOrThrow(mobileNetworkId);
        const prefix = await this.mobileNetworks.findPrefixById(prefixId);

        if (!prefix || prefix.mobileNetworkId !== mobileNetworkId) {
          throw new MobileNetworkNotFoundException(prefixId);
        }

        return prefix;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, mobileNetworkId, prefixId }, "Failed to retrieve mobile network prefix.");
        throw error;
      }
    });
  }

  async createPrefix(mobileNetworkId: string, dto: CreateMobileNetworkPrefixDto) {
    return withSpan("MobileNetworkService.createPrefix", async (span) => {
      this.logger.info({ mobileNetworkId, prefix: dto.prefix, countryCode: dto.countryCode }, "Creating mobile network prefix.");
      span.setAttribute("mobile_network.id", mobileNetworkId);
      span.setAttribute("mobile_network.prefix", dto.prefix);

      try {
        const network = await this.findEntityOrThrow(mobileNetworkId);
        await this.ensurePrefixAvailable(dto.countryCode, dto.prefix);

        const prefix = await this.mobileNetworks.createPrefix({
          mobileNetwork: { connect: { id: mobileNetworkId } },
          prefix: dto.prefix,
          countryCode: dto.countryCode,
          enabled: dto.enabled ?? true,
        });

        this.mobileNetworkPrefixesCreatedCounter.add(1);

        await this.audit.record({
          action: "mobile_network_prefix.created",
          resourceType: "MobileNetworkPrefix",
          resourceId: prefix.id,
          metadata: {
            mobileNetworkId: network.id,
            prefix: prefix.prefix,
            countryCode: prefix.countryCode,
            enabled: prefix.enabled,
          },
        });

        this.logger.info({ mobileNetworkId: network.id, prefixId: prefix.id }, "Mobile network prefix created successfully.");
        return prefix;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, mobileNetworkId, prefix: dto.prefix }, "Failed to create mobile network prefix.");
        throw error;
      }
    });
  }

  async updatePrefix(mobileNetworkId: string, prefixId: string, dto: UpdateMobileNetworkPrefixDto) {
    return withSpan("MobileNetworkService.updatePrefix", async (span) => {
      this.logger.info({ mobileNetworkId, prefixId }, "Updating mobile network prefix.");
      span.setAttribute("mobile_network.id", mobileNetworkId);
      span.setAttribute("mobile_network_prefix.id", prefixId);

      try {
        const existing = await this.findPrefixById(mobileNetworkId, prefixId);
        const update: Prisma.MobileNetworkPrefixUpdateInput = {};

        if (dto.prefix !== undefined) {
          await this.ensurePrefixAvailable(dto.countryCode ?? existing.countryCode, dto.prefix, prefixId);
          update.prefix = dto.prefix;
        }

        if (dto.countryCode !== undefined) {
          if (dto.prefix !== undefined) {
            await this.ensurePrefixAvailable(dto.countryCode, dto.prefix, prefixId);
          } else {
            await this.ensurePrefixAvailable(dto.countryCode, existing.prefix, prefixId);
          }
          update.countryCode = dto.countryCode;
        }

        if (dto.enabled !== undefined) {
          update.enabled = dto.enabled;
        }

        const prefix = await this.mobileNetworks.updatePrefix(prefixId, update);
        this.mobileNetworkPrefixesUpdatedCounter.add(1);

        await this.audit.record({
          action: "mobile_network_prefix.updated",
          resourceType: "MobileNetworkPrefix",
          resourceId: prefix.id,
          metadata: {
            mobileNetworkId,
            previousPrefix: existing.prefix,
            updatedPrefix: prefix.prefix,
            previousCountryCode: existing.countryCode,
            updatedCountryCode: prefix.countryCode,
            enabled: prefix.enabled,
          },
        });

        this.logger.info({ mobileNetworkId, prefixId: prefix.id }, "Mobile network prefix updated successfully.");
        return prefix;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, mobileNetworkId, prefixId }, "Failed to update mobile network prefix.");
        throw error;
      }
    });
  }

  async deletePrefix(mobileNetworkId: string, prefixId: string): Promise<void> {
    return withSpan("MobileNetworkService.deletePrefix", async (span) => {
      this.logger.info({ mobileNetworkId, prefixId }, "Deleting mobile network prefix.");
      span.setAttribute("mobile_network.id", mobileNetworkId);
      span.setAttribute("mobile_network_prefix.id", prefixId);

      try {
        const prefix = await this.findPrefixById(mobileNetworkId, prefixId);
        await this.mobileNetworks.deletePrefix(prefixId);
        this.mobileNetworkPrefixesDeletedCounter.add(1);

        await this.audit.record({
          action: "mobile_network_prefix.deleted",
          resourceType: "MobileNetworkPrefix",
          resourceId: prefix.id,
          metadata: {
            mobileNetworkId: prefix.mobileNetworkId,
            prefix: prefix.prefix,
            countryCode: prefix.countryCode,
          },
        });

        this.logger.info({ mobileNetworkId, prefixId }, "Mobile network prefix deleted successfully.");
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, mobileNetworkId, prefixId }, "Failed to delete mobile network prefix.");
        throw error;
      }
    });
  }

  async enablePrefix(mobileNetworkId: string, prefixId: string) {
    return this.updatePrefixStatus(mobileNetworkId, prefixId, true);
  }

  async disablePrefix(mobileNetworkId: string, prefixId: string) {
    return this.updatePrefixStatus(mobileNetworkId, prefixId, false);
  }

  private async updatePrefixStatus(mobileNetworkId: string, prefixId: string, enabled: boolean) {
    return withSpan("MobileNetworkService.updatePrefixStatus", async (span) => {
      this.logger.info({ mobileNetworkId, prefixId, enabled }, "Updating mobile network prefix status.");
      span.setAttribute("mobile_network.id", mobileNetworkId);
      span.setAttribute("mobile_network_prefix.id", prefixId);
      span.setAttribute("mobile_network_prefix.enabled", enabled);

      try {
        const existing = await this.findPrefixById(mobileNetworkId, prefixId);
        if (existing.enabled === enabled) return existing;

        const prefix = await this.mobileNetworks.updatePrefix(prefixId, { enabled });

        this.mobileNetworkPrefixesEnabledCounter.add(enabled ? 1 : 0);
        this.mobileNetworkPrefixesDisabledCounter.add(enabled ? 0 : 1);

        await this.audit.record({
          action: enabled ? "mobile_network_prefix.enabled" : "mobile_network_prefix.disabled",
          resourceType: "MobileNetworkPrefix",
          resourceId: prefix.id,
          metadata: {
            mobileNetworkId,
            prefix: prefix.prefix,
            countryCode: prefix.countryCode,
            previousStatus: existing.enabled,
            status: prefix.enabled,
          },
        });

        this.logger.info({ mobileNetworkId, prefixId, previousStatus: existing.enabled, status: prefix.enabled }, "Mobile network prefix status updated successfully.");
        return prefix;
      } catch (error) {
        recordException(error);
        this.logger.error({ err: error, mobileNetworkId, prefixId, enabled }, "Failed to update mobile network prefix status.");
        throw error;
      }
    });
  }

  private async ensureCodeAvailable(code: string, excludeId?: string): Promise<void> {
    const existing = await this.mobileNetworks.findByCode(code);

    if (existing && existing.id !== excludeId) {
      throw new MobileNetworkAlreadyExistsException(code);
    }
  }

  private async ensurePrefixAvailable(countryCode: string, prefix: string, excludeId?: string): Promise<void> {
    const existing = await this.mobileNetworks.findPrefixByCountryCodeAndPrefix(countryCode, prefix);

    if (existing && existing.id !== excludeId) {
      throw new MobileNetworkAlreadyExistsException(`${countryCode}:${prefix}`);
    }
  }

  private async findEntityOrThrow(id: string): Promise<MobileNetworkWithPrefixes> {
    const network = await this.mobileNetworks.findById(id);

    if (!network) {
      throw new MobileNetworkNotFoundException(id);
    }

    return network;
  }
}
