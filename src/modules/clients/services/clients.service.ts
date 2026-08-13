import { Injectable } from "@nestjs/common";
import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";
import {
  Client,
  ClientStatus,
  Prisma,
} from "@prisma/client";

import { AuditService } from "../../../audit/index.js";
import type { Page } from "../../../common/query/page.interface.js";
import { EmailAlreadyExistsException } from "../../../exceptions/auth/email-already-exists.exception.js";
import { ClientNotFoundException } from "../../../exceptions/entity/clients.exceptions.js";
import { ClientRepository } from "../../../repositories/ClientRepository.js";
import type { ClientQueryOptions } from "../../../repositories/options/client.options.js";
import { CreateClientDto } from "../dto/create-client.dto.js";
import { UpdateClientDto } from "../dto/update-client.dto.js";

@Injectable()
export class ClientService {
  private readonly logger =
    getComponentLogger("ClientService");

  constructor(
    private readonly clients: ClientRepository,
    private readonly audit: AuditService,
  ) { }

  private readonly clientsCreatedCounter =
    createCounterMetric({
      name: "clients.created",
      description: "Number of clients created.",
    });

  private readonly clientsUpdatedCounter =
    createCounterMetric({
      name: "clients.updated",
      description: "Number of clients updated.",
    });

  private readonly clientsDeletedCounter =
    createCounterMetric({
      name: "clients.deleted",
      description: "Number of clients deleted.",
    });

  private readonly clientsActivatedCounter =
    createCounterMetric({
      name: "clients.activated",
      description: "Number of clients activated.",
    });

  private readonly clientsSuspendedCounter =
    createCounterMetric({
      name: "clients.suspended",
      description: "Number of clients suspended.",
    });

  private readonly clientsDisabledCounter =
    createCounterMetric({
      name: "clients.disabled",
      description: "Number of clients disabled.",
    });

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(
    id: string,
  ): Promise<Client> {
    return withSpan(
      "ClientService.findById",
      async (span) => {
        this.logger.debug(
          { clientId: id },
          "Retrieving client.",
        );

        span.setAttribute(
          "client.id",
          id,
        );

        try {
          return await this.findEntityOrThrow(id);
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId: id,
            },
            "Failed to retrieve client.",
          );

          throw error;
        }
      },
    );
  }

  async findByPublicId(
    publicId: string,
  ): Promise<Client> {
    return withSpan(
      "ClientService.findByPublicId",
      async (span) => {
        this.logger.debug(
          { publicId },
          "Retrieving client by public identifier.",
        );

        span.setAttribute(
          "client.public_id",
          publicId,
        );

        try {
          const client =
            await this.clients.findByPublicId(
              publicId,
            );

          if (!client) {
            throw new ClientNotFoundException();
          }

          return client;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              publicId,
            },
            "Failed to retrieve client by public identifier.",
          );

          throw error;
        }
      },
    );
  }

  async findMany(
    query: ClientQueryOptions,
  ): Promise<Page<Client>> {
    return withSpan(
      "ClientService.findMany",
      async (span) => {
        this.logger.debug(
          { query },
          "Retrieving clients.",
        );

        try {
          const page =
            await this.clients.findMany(query);

          span.setAttribute(
            "clients.count",
            page.items.length,
          );

          span.setAttribute(
            "clients.total",
            page.totalItems,
          );

          this.logger.debug(
            {
              count: page.items.length,
              total: page.totalItems,
            },
            "Clients retrieved successfully.",
          );

          return page;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              query,
            },
            "Failed to retrieve clients.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async create(
    dto: CreateClientDto,
  ): Promise<Client> {
    return withSpan(
      "ClientService.create",
      async (span) => {
        this.logger.info(
          {
            companyName: dto.companyName,
            email: dto.email,
          },
          "Creating client.",
        );

        span.setAttribute(
          "client.company_name",
          dto.companyName,
        );

        try {
          await this.ensureEmailAvailable(
            dto.email,
          );

          const client =
            await this.clients.create({
              publicId:
                dto.clientCode,

              companyName:
                dto.companyName,

              displayName:
                dto.displayName ??
                dto.companyName,

              email: dto.email,

              phone:
                dto.phone,

              rateLimitPerSecond:
                dto.rateLimitPerSecond,

              timezone:
                dto.timezone,
            });

          this.clientsCreatedCounter.add(1);

          await this.audit.record({
            action: "client.created",
            clientId: client.id,
            resourceType: "Client",
            resourceId: client.id,
            metadata: {
              publicId: client.publicId,
              companyName: client.companyName,
              email: client.email,
            },
          });

          span.setAttribute(
            "client.id",
            client.id,
          );

          this.logger.info(
            {
              clientId: client.id,
              publicId: client.publicId,
            },
            "Client created successfully.",
          );

          return client;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              companyName: dto.companyName,
              email: dto.email,
            },
            "Failed to create client.",
          );

          throw error;
        }
      },
    );
  }

  async update(
    id: string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    return withSpan(
      "ClientService.update",
      async (span) => {
        this.logger.info(
          { clientId: id },
          "Updating client.",
        );

        span.setAttribute(
          "client.id",
          id,
        );

        try {
          const existing =
            await this.findEntityOrThrow(id);

          if (
            dto.email !== undefined &&
            dto.email !== existing.email
          ) {
            await this.ensureEmailAvailable(
              dto.email,
            );
          }

          const update:
            Prisma.ClientUpdateInput = {};

          if (
            dto.companyName !== undefined
          ) {
            update.companyName =
              dto.companyName;
          }

          if (
            dto.displayName !== undefined
          ) {
            update.displayName =
              dto.displayName;
          }

          if (
            dto.email !== undefined
          ) {
            update.email =
              dto.email;
          }

          if (
            dto.phone !== undefined
          ) {
            update.phone =
              dto.phone;
          }

          if (
            dto.rateLimitPerSecond !== undefined
          ) {
            update.rateLimitPerSecond =
              dto.rateLimitPerSecond;
          }

          if (
            dto.timezone !== undefined
          ) {
            update.timezone =
              dto.timezone;
          }

          const client =
            await this.clients.update(
              id,
              update,
            );

          this.clientsUpdatedCounter.add(1);

          await this.audit.record({
            action: "client.updated",
            clientId: client.id,
            resourceType: "Client",
            resourceId: client.id,
            metadata: {
              publicId: client.publicId,
              companyName:
                client.companyName,
              email: client.email,
            },
          });

          this.logger.info(
            {
              clientId: client.id,
            },
            "Client updated successfully.",
          );

          return client;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId: id,
            },
            "Failed to update client.",
          );

          throw error;
        }
      },
    );
  }

  async delete(
    id: string,
  ): Promise<void> {
    return withSpan(
      "ClientService.delete",
      async (span) => {
        this.logger.info(
          { clientId: id },
          "Deleting client.",
        );

        span.setAttribute(
          "client.id",
          id,
        );

        try {
          const client =
            await this.findEntityOrThrow(id);

          await this.clients.delete(id);

          this.clientsDeletedCounter.add(1);

          await this.audit.record({
            action: "client.deleted",
            clientId: client.id,
            resourceType: "Client",
            resourceId: client.id,
            metadata: {
              publicId: client.publicId,
              companyName:
                client.companyName,
              email: client.email,
            },
          });

          this.logger.info(
            {
              clientId: id,
            },
            "Client deleted successfully.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId: id,
            },
            "Failed to delete client.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  async activate(
    id: string,
  ): Promise<Client> {
    return this.updateStatus(
      id,
      ClientStatus.ACTIVE,
    );
  }

  async suspend(
    id: string,
  ): Promise<Client> {
    return this.updateStatus(
      id,
      ClientStatus.SUSPENDED,
    );
  }

  async disable(
    id: string,
  ): Promise<Client> {
    return this.updateStatus(
      id,
      ClientStatus.DISABLED,
    );
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async updateStatus(
    id: string,
    status: ClientStatus,
  ): Promise<Client> {
    return withSpan(
      "ClientService.updateStatus",
      async (span) => {
        this.logger.info(
          {
            clientId: id,
            status,
          },
          "Updating client status.",
        );

        span.setAttribute(
          "client.id",
          id,
        );

        span.setAttribute(
          "client.status",
          status,
        );

        try {
          const existing =
            await this.findEntityOrThrow(id);

          if (existing.status === status) {
            return existing;
          }

          const client =
            await this.clients.update(
              id,
              {
                status,
              },
            );

          switch (status) {
            case ClientStatus.ACTIVE:
              this.clientsActivatedCounter.add(1);
              break;

            case ClientStatus.SUSPENDED:
              this.clientsSuspendedCounter.add(1);
              break;

            case ClientStatus.DISABLED:
              this.clientsDisabledCounter.add(1);
              break;
          }

          await this.audit.record({
            action:
              status === ClientStatus.ACTIVE
                ? "client.activated"
                : status === ClientStatus.SUSPENDED
                  ? "client.suspended"
                  : "client.disabled",

            clientId: client.id,
            resourceType: "Client",
            resourceId: client.id,

            metadata: {
              previousStatus:
                existing.status,
              status: client.status,
            },
          });

          this.logger.info(
            {
              clientId: client.id,
              previousStatus:
                existing.status,
              status: client.status,
            },
            "Client status updated successfully.",
          );

          return client;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId: id,
              status,
            },
            "Failed to update client status.",
          );

          throw error;
        }
      },
    );
  }

  private async findEntityOrThrow(
    id: string,
  ): Promise<Client> {
    return withSpan(
      "ClientService.findEntityOrThrow",
      async (span) => {
        this.logger.debug(
          { clientId: id },
          "Finding client entity.",
        );

        span.setAttribute(
          "client.id",
          id,
        );

        try {
          const client =
            await this.clients.findById(id);

          if (!client) {
            throw new ClientNotFoundException();
          }

          return client;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId: id,
            },
            "Failed to find client entity.",
          );

          throw error;
        }
      },
    );
  }

  private async ensureEmailAvailable(
    email: string,
  ): Promise<void> {
    return withSpan(
      "ClientService.ensureEmailAvailable",
      async () => {
        this.logger.debug(
          { email },
          "Checking client email availability.",
        );

        try {
          if (
            await this.clients.existsByEmail(
              email,
            )
          ) {
            throw new EmailAlreadyExistsException(
              email,
            );
          }

          this.logger.debug(
            { email },
            "Client email is available.",
          );
        } catch (error) {
          recordException(error);

          if (
            error instanceof
            EmailAlreadyExistsException
          ) {
            this.logger.warn(
              { email },
              "Client email already exists.",
            );
          } else {
            this.logger.error(
              {
                err: error,
                email,
              },
              "Failed to check client email availability.",
            );
          }

          throw error;
        }
      },
    );
  }
}