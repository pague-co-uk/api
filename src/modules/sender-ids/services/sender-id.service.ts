import { Injectable } from "@nestjs/common";
import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";
import {
  Prisma,
  SenderId,
  SenderIdStatus,
} from "@prisma/client";

import { AuditService } from "../../../audit/index.js";
import type { Page } from "../../../common/query/page.interface.js";
import { ClientNotFoundException } from "../../../exceptions/entity/clients.exceptions.js";
import { SenderIdAlreadyExistsException, SenderIdNotApprovedException, SenderIdNotFoundException } from "../../../exceptions/entity/sender-ids.exceptions.js";
import { ClientRepository } from "../../../repositories/ClientRepository.js";
import { SenderIdRepository } from "../../../repositories/SenderIdRepository.js";
import type { SenderIdQueryOptions } from "../../../repositories/options/sender-id.options.js";
import { CreateSenderIdDto } from "../dto/create-sender-id.dto.js";
import { UpdateSenderIdDto } from "../dto/update-sender-id.dto.js";

@Injectable()
export class SenderIdService {
  private readonly logger =
    getComponentLogger("SenderIdService");

  constructor(
    private readonly senderIds: SenderIdRepository,
    private readonly clients: ClientRepository,
    private readonly audit: AuditService,
  ) { }

  private readonly senderIdsCreatedCounter =
    createCounterMetric({
      name: "sender_ids.created",
      description:
        "Number of Sender IDs created.",
    });

  private readonly senderIdsUpdatedCounter =
    createCounterMetric({
      name: "sender_ids.updated",
      description:
        "Number of Sender IDs updated.",
    });

  private readonly senderIdsDeletedCounter =
    createCounterMetric({
      name: "sender_ids.deleted",
      description:
        "Number of Sender IDs deleted.",
    });

  private readonly senderIdsApprovedCounter =
    createCounterMetric({
      name: "sender_ids.approved",
      description:
        "Number of Sender IDs approved.",
    });

  private readonly senderIdsRejectedCounter =
    createCounterMetric({
      name: "sender_ids.rejected",
      description:
        "Number of Sender IDs rejected.",
    });

  private readonly senderIdsDisabledCounter =
    createCounterMetric({
      name: "sender_ids.disabled",
      description:
        "Number of Sender IDs disabled.",
    });

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(
    id: string,
  ): Promise<SenderId> {
    return withSpan(
      "SenderIdService.findById",
      async (span) => {
        this.logger.debug(
          { senderId: id },
          "Retrieving Sender ID.",
        );

        span.setAttribute(
          "sender_id.id",
          id,
        );

        try {
          return await this.findEntityOrThrow(id);
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              senderId: id,
            },
            "Failed to retrieve Sender ID.",
          );

          throw error;
        }
      },
    );
  }

  async findByPublicId(
    publicId: string,
  ): Promise<SenderId> {
    return withSpan(
      "SenderIdService.findByPublicId",
      async (span) => {
        this.logger.debug(
          { publicId },
          "Retrieving Sender ID by public identifier.",
        );

        span.setAttribute(
          "sender_id.public_id",
          publicId,
        );

        try {
          const senderId =
            await this.senderIds.findByPublicId(
              publicId,
            );

          if (!senderId) {
            throw new SenderIdNotFoundException(publicId);
          }

          return senderId;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              publicId,
            },
            "Failed to retrieve Sender ID by public identifier.",
          );

          throw error;
        }
      },
    );
  }

  async findMany(
    query: SenderIdQueryOptions,
  ): Promise<Page<SenderId>> {
    return withSpan(
      "SenderIdService.findMany",
      async (span) => {
        this.logger.debug(
          { query },
          "Retrieving Sender IDs.",
        );

        try {
          const page =
            await this.senderIds.findMany(
              query,
            );

          span.setAttribute(
            "sender_ids.count",
            page.items.length,
          );

          span.setAttribute(
            "sender_ids.total",
            page.totalItems,
          );

          this.logger.debug(
            {
              count: page.items.length,
              total: page.totalItems,
            },
            "Sender IDs retrieved successfully.",
          );

          return page;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              query,
            },
            "Failed to retrieve Sender IDs.",
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
    dto: CreateSenderIdDto,
  ): Promise<SenderId> {
    return withSpan(
      "SenderIdService.create",
      async (span) => {
        this.logger.info(
          {
            clientId: dto.clientId,
            sender: dto.sender,
          },
          "Creating Sender ID.",
        );

        span.setAttribute(
          "client.id",
          dto.clientId,
        );

        span.setAttribute(
          "sender_id.sender",
          dto.sender,
        );

        try {
          await this.ensureClientExists(
            dto.clientId,
          );

          await this.ensureSenderAvailable(
            dto.clientId,
            dto.sender,
          );

          const senderId =
            await this.senderIds.create({
              publicId: dto.publicId,
              client: {
                connect: {
                  id: dto.clientId,
                },
              },
              sender: dto.sender,
              status:
                SenderIdStatus.PENDING,
              isDefault: false,
            });

          this.senderIdsCreatedCounter.add(1);

          await this.audit.record({
            action: "sender_id.created",
            clientId: senderId.clientId,
            resourceType: "SenderId",
            resourceId: senderId.id,
            metadata: {
              publicId:
                senderId.publicId,
              sender:
                senderId.sender,
              status:
                senderId.status,
              isDefault:
                senderId.isDefault,
            },
          });

          span.setAttribute(
            "sender_id.id",
            senderId.id,
          );

          this.logger.info(
            {
              senderId: senderId.id,
              clientId:
                senderId.clientId,
              sender:
                senderId.sender,
            },
            "Sender ID created successfully.",
          );

          return senderId;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId: dto.clientId,
              sender: dto.sender,
            },
            "Failed to create Sender ID.",
          );

          throw error;
        }
      },
    );
  }

  async update(
    id: string,
    dto: UpdateSenderIdDto,
  ): Promise<SenderId> {
    return withSpan(
      "SenderIdService.update",
      async (span) => {
        this.logger.info(
          { senderId: id },
          "Updating Sender ID.",
        );

        span.setAttribute(
          "sender_id.id",
          id,
        );

        try {
          const existing =
            await this.findEntityOrThrow(id);

          if (
            dto.sender !== undefined &&
            dto.sender !== existing.sender
          ) {
            await this.ensureSenderAvailable(
              existing.clientId,
              dto.sender,
            );
          }

          const update:
            Prisma.SenderIdUpdateInput = {};

          if (
            dto.sender !== undefined
          ) {
            update.sender =
              dto.sender;
          }

          const senderId =
            await this.senderIds.update(
              id,
              update,
            );

          this.senderIdsUpdatedCounter.add(1);

          await this.audit.record({
            action: "sender_id.updated",
            clientId:
              senderId.clientId,
            resourceType: "SenderId",
            resourceId: senderId.id,
            metadata: {
              publicId:
                senderId.publicId,
              sender:
                senderId.sender,
              isDefault:
                senderId.isDefault,
            },
          });

          this.logger.info(
            {
              senderId: senderId.id,
            },
            "Sender ID updated successfully.",
          );

          return senderId;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              senderId: id,
            },
            "Failed to update Sender ID.",
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
      "SenderIdService.delete",
      async (span) => {
        this.logger.info(
          { senderId: id },
          "Deleting Sender ID.",
        );

        span.setAttribute(
          "sender_id.id",
          id,
        );

        try {
          const senderId =
            await this.findEntityOrThrow(id);

          await this.senderIds.delete(id);

          this.senderIdsDeletedCounter.add(1);

          await this.audit.record({
            action: "sender_id.deleted",
            clientId:
              senderId.clientId,
            resourceType: "SenderId",
            resourceId: senderId.id,
            metadata: {
              publicId:
                senderId.publicId,
              sender:
                senderId.sender,
            },
          });

          this.logger.info(
            {
              senderId: id,
            },
            "Sender ID deleted successfully.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              senderId: id,
            },
            "Failed to delete Sender ID.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  async approve(
    id: string,
  ): Promise<SenderId> {
    return this.updateStatus(
      id,
      SenderIdStatus.APPROVED,
    );
  }

  async reject(
    id: string,
  ): Promise<SenderId> {
    return this.updateStatus(
      id,
      SenderIdStatus.REJECTED,
    );
  }

  async disable(
    id: string,
  ): Promise<SenderId> {
    return this.updateStatus(
      id,
      SenderIdStatus.DISABLED,
    );
  }

  async setDefault(
    id: string,
  ): Promise<SenderId> {
    return withSpan(
      "SenderIdService.setDefault",
      async (span) => {
        this.logger.info(
          { senderId: id },
          "Setting Sender ID as default.",
        );

        span.setAttribute(
          "sender_id.id",
          id,
        );

        try {
          const existing =
            await this.findEntityOrThrow(id);

          if (
            existing.status !==
            SenderIdStatus.APPROVED
          ) {
            throw new SenderIdNotApprovedException(id);
          }

          if (existing.isDefault) {
            return existing;
          }

          const senderId =
            await this.senderIds.withTransaction(
              async (tx) => {
                const senderIds =
                  this.senderIds.withDatabase(tx);

                await senderIds.clearDefaultByClient(
                  existing.clientId,
                );

                return senderIds.update(
                  id,
                  {
                    isDefault: true,
                  },
                );
              },
            );

          await this.audit.record({
            action: "sender_id.default_changed",
            clientId: senderId.clientId,
            resourceType: "SenderId",
            resourceId: senderId.id,
            metadata: {
              publicId:
                senderId.publicId,
              sender:
                senderId.sender,
              isDefault: true,
            },
          });

          this.logger.info(
            {
              senderId: senderId.id,
              clientId:
                senderId.clientId,
            },
            "Sender ID set as default successfully.",
          );

          return senderId;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              senderId: id,
            },
            "Failed to set Sender ID as default.",
          );

          throw error;
        }
      },
    );
  }
  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async updateStatus(
    id: string,
    status: SenderIdStatus,
  ): Promise<SenderId> {
    return withSpan(
      "SenderIdService.updateStatus",
      async (span) => {
        this.logger.info(
          {
            senderId: id,
            status,
          },
          "Updating Sender ID status.",
        );

        span.setAttribute(
          "sender_id.id",
          id,
        );

        span.setAttribute(
          "sender_id.status",
          status,
        );

        try {
          const existing =
            await this.findEntityOrThrow(id);

          if (existing.status === status) {
            return existing;
          }

          const update: Prisma.SenderIdUpdateInput = {
            status,
          };

          if (
            (
              status ===
              SenderIdStatus.REJECTED ||
              status ===
              SenderIdStatus.DISABLED
            ) &&
            existing.isDefault
          ) {
            update.isDefault = false;
          }

          const senderId =
            await this.senderIds.update(
              id,
              update,
            );

          switch (status) {
            case SenderIdStatus.APPROVED:
              this.senderIdsApprovedCounter.add(1);
              break;

            case SenderIdStatus.REJECTED:
              this.senderIdsRejectedCounter.add(1);
              break;

            case SenderIdStatus.DISABLED:
              this.senderIdsDisabledCounter.add(1);
              break;
          }

          await this.audit.record({
            action:
              status ===
                SenderIdStatus.APPROVED
                ? "sender_id.approved"
                : status ===
                  SenderIdStatus.REJECTED
                  ? "sender_id.rejected"
                  : "sender_id.disabled",

            clientId:
              senderId.clientId,

            resourceType: "SenderId",
            resourceId: senderId.id,

            metadata: {
              publicId:
                senderId.publicId,
              sender:
                senderId.sender,
              previousStatus:
                existing.status,
              status:
                senderId.status,
            },
          });

          this.logger.info(
            {
              senderId:
                senderId.id,
              previousStatus:
                existing.status,
              status:
                senderId.status,
            },
            "Sender ID status updated successfully.",
          );

          return senderId;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              senderId: id,
              status,
            },
            "Failed to update Sender ID status.",
          );

          throw error;
        }
      },
    );
  }
  private async ensureClientExists(
    clientId: string,
  ): Promise<void> {
    return withSpan(
      "SenderIdService.ensureClientExists",
      async () => {
        const client =
          await this.clients.findById(
            clientId,
          );

        if (!client) {
          throw new ClientNotFoundException();
        }
      },
    );
  }

  private async ensureSenderAvailable(
    clientId: string,
    sender: string,
  ): Promise<void> {
    return withSpan(
      "SenderIdService.ensureSenderAvailable",
      async () => {
        const exists =
          await this.senderIds.existsByClientAndSender(
            clientId,
            sender,
          );

        if (exists) {
          throw new SenderIdAlreadyExistsException(
            sender,
          );
        }
      },
    );
  }

  private async findEntityOrThrow(
    id: string,
  ): Promise<SenderId> {
    return withSpan(
      "SenderIdService.findEntityOrThrow",
      async (span) => {
        this.logger.debug(
          { senderId: id },
          "Finding Sender ID entity.",
        );

        span.setAttribute(
          "sender_id.id",
          id,
        );

        const senderId =
          await this.senderIds.findById(id);

        if (!senderId) {
          throw new SenderIdNotFoundException(id);
        }

        return senderId;
      },
    );
  }
}