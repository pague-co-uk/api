import { Injectable } from "@nestjs/common";

import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import {
  MobileNetworkStatus,
  Prisma,
} from "@prisma/client";

import { AuditService } from "../../../audit/index.js";
import type { Page } from "../../../common/query/page.interface.js";
import {
  MobileNetworkAlreadyExistsException,
  MobileNetworkNotFoundException,
} from "../../../exceptions/entity/mobile-networks.exceptions.js";
import { CountryRepository } from "../../../repositories/country.repository.js";
import { MobileNetworkRepository } from "../../../repositories/MobileNetworkRepository.js";
import type { MobileNetworkQueryOptions } from "../../../repositories/options/mobile-network.options.js";
import { CreateMobileNetworkDto } from "../dto/create-mobile-network.dto.js";
import { UpdateMobileNetworkDto } from "../dto/update-mobile-network.dto.js";

type MobileNetworkWithCountry =
  Prisma.MobileNetworkGetPayload<{
    include: {
      country: true;
    };
  }>;

@Injectable()
export class MobileNetworkService {
  private readonly logger =
    getComponentLogger(
      "MobileNetworkService",
    );

  constructor(
    private readonly mobileNetworks:
      MobileNetworkRepository,

    private readonly countries:
      CountryRepository,

    private readonly audit:
      AuditService,
  ) { }

  // =========================================================================
  // Metrics
  // =========================================================================

  private readonly mobileNetworksCreatedCounter =
    createCounterMetric({
      name: "mobile_networks.created",
      description:
        "Number of mobile networks created.",
    });

  private readonly mobileNetworksUpdatedCounter =
    createCounterMetric({
      name: "mobile_networks.updated",
      description:
        "Number of mobile networks updated.",
    });

  private readonly mobileNetworksDeletedCounter =
    createCounterMetric({
      name: "mobile_networks.deleted",
      description:
        "Number of mobile networks deleted.",
    });

  // =========================================================================
  // Find
  // =========================================================================

  async findById(
    id: string,
  ): Promise<MobileNetworkWithCountry> {
    return withSpan(
      "MobileNetworkService.findById",
      async (span) => {
        this.logger.debug(
          {
            mobileNetworkId:
              id,
          },
          "Retrieving mobile network.",
        );

        span.setAttribute(
          "mobile_network.id",
          id,
        );

        try {
          return await this.findEntityOrThrow(
            id,
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              mobileNetworkId:
                id,
            },
            "Failed to retrieve mobile network.",
          );

          throw error;
        }
      },
    );
  }

  async findByPublicId(
    publicId: string,
  ): Promise<MobileNetworkWithCountry> {
    return withSpan(
      "MobileNetworkService.findByPublicId",
      async (span) => {
        this.logger.debug(
          {
            publicId,
          },
          "Retrieving mobile network by public identifier.",
        );

        span.setAttribute(
          "mobile_network.public_id",
          publicId,
        );

        try {
          const network =
            await this.mobileNetworks.findByPublicId(
              publicId,
            );

          if (!network) {
            throw new MobileNetworkNotFoundException(
              publicId,
            );
          }

          return network;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              publicId,
            },
            "Failed to retrieve mobile network by public identifier.",
          );

          throw error;
        }
      },
    );
  }

  async findMany(
    query: MobileNetworkQueryOptions,
  ): Promise<Page<MobileNetworkWithCountry>> {
    return withSpan(
      "MobileNetworkService.findMany",
      async (span) => {
        this.logger.debug(
          {
            query,
          },
          "Retrieving mobile networks.",
        );

        try {
          const page =
            await this.mobileNetworks.findMany(
              query,
            );

          span.setAttribute(
            "mobile_networks.count",
            page.items.length,
          );

          span.setAttribute(
            "mobile_networks.total",
            page.totalItems,
          );

          this.logger.debug(
            {
              count:
                page.items.length,

              total:
                page.totalItems,
            },
            "Mobile networks retrieved successfully.",
          );

          return page;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              query,
            },
            "Failed to retrieve mobile networks.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Create
  // =========================================================================

  async create(
    dto: CreateMobileNetworkDto,
  ): Promise<MobileNetworkWithCountry> {
    return withSpan(
      "MobileNetworkService.create",
      async (span) => {
        this.logger.info(
          {
            publicId:
              dto.publicId,

            code:
              dto.code,

            countryCode:
              dto.countryCode,
          },
          "Creating mobile network.",
        );

        span.setAttributes({
          "mobile_network.public_id":
            dto.publicId,

          "mobile_network.code":
            dto.code,

          "mobile_network.country_code":
            dto.countryCode,
        });

        try {
          // -----------------------------------------------------------------
          // Validate country
          // -----------------------------------------------------------------

          const country =
            await this.countries.findByCode(
              dto.countryCode,
            );

          if (!country) {
            throw new Error(
              `Country not found: ${dto.countryCode}`,
            );
          }

          // -----------------------------------------------------------------
          // Validate code
          // -----------------------------------------------------------------

          await this.ensureCodeAvailable(
            dto.code,
          );

          // -----------------------------------------------------------------
          // Validate routing regex
          // -----------------------------------------------------------------

          this.validateRoutingRegex(
            dto.routingRegex,
          );

          // -----------------------------------------------------------------
          // Create
          // -----------------------------------------------------------------

          const network =
            await this.mobileNetworks.create(
              {
                publicId:
                  dto.publicId,

                name:
                  dto.name,

                code:
                  dto.code,

                country: {
                  connect: {
                    id:
                      country.id,
                  },
                },

                routingRegex:
                  dto.routingRegex,

                status:
                  MobileNetworkStatus.ACTIVE,
              },
            );

          this.mobileNetworksCreatedCounter.add(
            1,
          );

          await this.audit.record({
            action:
              "mobile_network.created",

            resourceType:
              "MobileNetwork",

            resourceId:
              network.id,

            metadata: {
              publicId:
                network.publicId,

              code:
                network.code,

              countryCode:
                network.country.code,

              routingRegex:
                network.routingRegex,

              status:
                network.status,
            },
          });

          this.logger.info(
            {
              mobileNetworkId:
                network.id,

              countryCode:
                network.country.code,
            },
            "Mobile network created successfully.",
          );

          return network;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              publicId:
                dto.publicId,

              code:
                dto.code,

              countryCode:
                dto.countryCode,
            },
            "Failed to create mobile network.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Update
  // =========================================================================

  async update(
    id: string,
    dto: UpdateMobileNetworkDto,
  ): Promise<MobileNetworkWithCountry> {
    return withSpan(
      "MobileNetworkService.update",
      async (span) => {
        this.logger.info(
          {
            mobileNetworkId:
              id,
          },
          "Updating mobile network.",
        );

        span.setAttribute(
          "mobile_network.id",
          id,
        );

        try {
          const existing =
            await this.findEntityOrThrow(
              id,
            );

          const update:
            Prisma.MobileNetworkUpdateInput =
            {};

          // -----------------------------------------------------------------
          // Name
          // -----------------------------------------------------------------

          if (
            dto.name !==
            undefined
          ) {
            update.name =
              dto.name;
          }

          // -----------------------------------------------------------------
          // Code
          // -----------------------------------------------------------------

          if (
            dto.code !==
            undefined
          ) {
            update.code =
              dto.code;
          }

          // -----------------------------------------------------------------
          // Country
          // -----------------------------------------------------------------

          if (
            dto.countryCode !==
            undefined
          ) {
            const country =
              await this.countries.findByCode(
                dto.countryCode,
              );

            if (!country) {
              throw new Error(
                `Country not found: ${dto.countryCode}`,
              );
            }

            update.country = {
              connect: {
                id:
                  country.id,
              },
            };
          }

          // -----------------------------------------------------------------
          // Routing regex
          // -----------------------------------------------------------------

          if (
            dto.routingRegex !==
            undefined
          ) {
            this.validateRoutingRegex(
              dto.routingRegex,
            );

            update.routingRegex =
              dto.routingRegex;
          }

          // -----------------------------------------------------------------
          // Validate code uniqueness
          // -----------------------------------------------------------------

          if (
            dto.code !==
            undefined &&
            dto.code !==
            existing.code
          ) {
            await this.ensureCodeAvailable(
              dto.code,
              id,
            );
          }

          // -----------------------------------------------------------------
          // Update
          // -----------------------------------------------------------------

          const network =
            await this.mobileNetworks.update(
              id,
              update,
            );

          this.mobileNetworksUpdatedCounter.add(
            1,
          );

          await this.audit.record({
            action:
              "mobile_network.updated",

            resourceType:
              "MobileNetwork",

            resourceId:
              network.id,

            metadata: {
              publicId:
                network.publicId,

              previousCode:
                existing.code,

              updatedCode:
                network.code,

              previousCountryCode:
                existing.country.code,

              updatedCountryCode:
                network.country.code,

              previousRoutingRegex:
                existing.routingRegex,

              updatedRoutingRegex:
                network.routingRegex,
            },
          });

          this.logger.info(
            {
              mobileNetworkId:
                network.id,

              countryCode:
                network.country.code,
            },
            "Mobile network updated successfully.",
          );

          return network;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              mobileNetworkId:
                id,
            },
            "Failed to update mobile network.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Delete
  // =========================================================================

  async delete(
    id: string,
  ): Promise<void> {
    return withSpan(
      "MobileNetworkService.delete",
      async (span) => {
        this.logger.info(
          {
            mobileNetworkId:
              id,
          },
          "Deleting mobile network.",
        );

        span.setAttribute(
          "mobile_network.id",
          id,
        );

        try {
          const network =
            await this.findEntityOrThrow(
              id,
            );

          await this.mobileNetworks.delete(
            id,
          );

          this.mobileNetworksDeletedCounter.add(
            1,
          );

          await this.audit.record({
            action:
              "mobile_network.deleted",

            resourceType:
              "MobileNetwork",

            resourceId:
              network.id,

            metadata: {
              publicId:
                network.publicId,

              code:
                network.code,

              countryCode:
                network.country.code,

              routingRegex:
                network.routingRegex,
            },
          });

          this.logger.info(
            {
              mobileNetworkId:
                id,

              countryCode:
                network.country.code,
            },
            "Mobile network deleted successfully.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              mobileNetworkId:
                id,
            },
            "Failed to delete mobile network.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Status
  // =========================================================================

  async enable(
    id: string,
  ): Promise<MobileNetworkWithCountry> {
    return this.updateStatus(
      id,
      MobileNetworkStatus.ACTIVE,
    );
  }

  async disable(
    id: string,
  ): Promise<MobileNetworkWithCountry> {
    return this.updateStatus(
      id,
      MobileNetworkStatus.DISABLED,
    );
  }

  private async updateStatus(
    id: string,
    status: MobileNetworkStatus,
  ): Promise<MobileNetworkWithCountry> {
    return withSpan(
      "MobileNetworkService.updateStatus",
      async (span) => {
        this.logger.info(
          {
            mobileNetworkId:
              id,

            status,
          },
          "Updating mobile network status.",
        );

        span.setAttribute(
          "mobile_network.id",
          id,
        );

        span.setAttribute(
          "mobile_network.status",
          status,
        );

        try {
          const existing =
            await this.findEntityOrThrow(
              id,
            );

          if (
            existing.status ===
            status
          ) {
            return existing;
          }

          const network =
            await this.mobileNetworks.update(
              id,
              {
                status,
              },
            );

          await this.audit.record({
            action:
              status ===
                MobileNetworkStatus.ACTIVE
                ? "mobile_network.enabled"
                : "mobile_network.disabled",

            resourceType:
              "MobileNetwork",

            resourceId:
              network.id,

            metadata: {
              publicId:
                network.publicId,

              previousStatus:
                existing.status,

              status:
                network.status,
            },
          });

          this.logger.info(
            {
              mobileNetworkId:
                network.id,

              previousStatus:
                existing.status,

              status:
                network.status,
            },
            "Mobile network status updated successfully.",
          );

          return network;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,

              mobileNetworkId:
                id,

              status,
            },
            "Failed to update mobile network status.",
          );

          throw error;
        }
      },
    );
  }

  // =========================================================================
  // Validation
  // =========================================================================

  private validateRoutingRegex(
    routingRegex:
      | string
      | null
      | undefined,
  ): void {
    if (
      routingRegex ===
      undefined ||
      routingRegex ===
      null ||
      routingRegex.trim() ===
      ""
    ) {
      return;
    }

    const pattern =
      routingRegex.startsWith(
        "^",
      )
        ? routingRegex
        : `^${routingRegex}`;

    try {
      new RegExp(pattern);
    } catch {
      throw new Error(
        `Invalid mobile network routing regex: ${routingRegex}`,
      );
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private async ensureCodeAvailable(
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing =
      await this.mobileNetworks.findByCode(
        code,
      );

    if (
      existing &&
      existing.id !==
      excludeId
    ) {
      throw new MobileNetworkAlreadyExistsException(
        code,
      );
    }
  }

  private async findEntityOrThrow(
    id: string,
  ): Promise<MobileNetworkWithCountry> {
    const network =
      await this.mobileNetworks.findById(
        id,
      );

    if (!network) {
      throw new MobileNetworkNotFoundException(
        id,
      );
    }

    return network;
  }
}