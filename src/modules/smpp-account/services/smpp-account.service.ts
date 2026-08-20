import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  Prisma,
  SmppAccountStatus,
} from "@prisma/client";

import { RandomGenerator } from "../../../common/services/random.service.js";
import { SecretHasher } from "../../../common/services/secretHasher.service.js";
import { SmppAccountRepository } from "../../../repositories/smppAccountRepository.js";

import type { CreateSmppAccountDto } from "../dto/create-smpp-account.dto.js";
import type { UpdateSmppAccountDto } from "../dto/update-smpp-account.dto.js";

@Injectable()
export class SmppAccountService {
  constructor(
    private readonly accounts: SmppAccountRepository,
    private readonly random: RandomGenerator,
    private readonly hasher: SecretHasher,
  ) { }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(
    clientId: string,
    dto: CreateSmppAccountDto,
  ) {
    const existing =
      await this.accounts.findBySystemId(
        dto.systemId,
      );

    if (existing) {
      throw new ConflictException(
        "An SMPP account with this system ID already exists.",
      );
    }

    const publicId =
      this.generatePublicId();

    const passwordHash =
      await this.hasher.hash(
        dto.password,
      );

    return this.accounts.create({
      publicId,

      client: {
        connect: {
          id: clientId,
        },
      },

      systemId:
        dto.systemId,

      passwordHash,

      status:
        SmppAccountStatus.ACTIVE,

      maxConcurrentBinds:
        dto.maxConcurrentBinds ?? 1,

      enquireLinkInterval:
        dto.enquireLinkInterval ?? 30,
    });
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findByClient(
    clientId: string,
  ) {
    return this.accounts.findByClient(
      clientId,
    );
  }

  async findById(
    clientId: string,
    id: string,
  ) {
    const account =
      await this.accounts.findById(
        id,
      );

    return this.ensureClientOwnership(
      account,
      clientId,
    );
  }

  async findByPublicId(
    clientId: string,
    publicId: string,
  ) {
    const account =
      await this.accounts.findByPublicId(
        publicId,
      );

    return this.ensureClientOwnership(
      account,
      clientId,
    );
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  async update(
    clientId: string,
    id: string,
    dto: UpdateSmppAccountDto,
  ) {
    const account =
      await this.findById(
        clientId,
        id,
      );

    const data: Prisma.SmppAccountUpdateInput = {};

    if (
      dto.maxConcurrentBinds !==
      undefined
    ) {
      data.maxConcurrentBinds =
        dto.maxConcurrentBinds;
    }

    if (
      dto.enquireLinkInterval !==
      undefined
    ) {
      data.enquireLinkInterval =
        dto.enquireLinkInterval;
    }

    if (
      Object.keys(data).length === 0
    ) {
      return account;
    }

    return this.accounts.update(
      account.id,
      data,
    );
  }

  // -------------------------------------------------------------------------
  // Password
  // -------------------------------------------------------------------------

  async changePassword(
    clientId: string,
    id: string,
    password: string,
  ) {
    const account =
      await this.findById(
        clientId,
        id,
      );

    const passwordHash =
      await this.hasher.hash(
        password,
      );

    return this.accounts.updatePassword(
      account.id,
      passwordHash,
    );
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  async activate(
    clientId: string,
    id: string,
  ) {
    const account =
      await this.findById(
        clientId,
        id,
      );

    if (
      account.status ===
      SmppAccountStatus.ACTIVE
    ) {
      return account;
    }

    return this.accounts.updateStatus(
      account.id,
      SmppAccountStatus.ACTIVE,
    );
  }

  async disable(
    clientId: string,
    id: string,
  ) {
    const account =
      await this.findById(
        clientId,
        id,
      );

    if (
      account.status ===
      SmppAccountStatus.DISABLED
    ) {
      return account;
    }

    return this.accounts.updateStatus(
      account.id,
      SmppAccountStatus.DISABLED,
    );
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private ensureClientOwnership(
    account: Awaited<
      ReturnType<
        SmppAccountRepository["findById"]
      >
    >,
    clientId: string,
  ) {
    if (
      !account ||
      account.clientId !== clientId
    ) {
      throw new NotFoundException(
        "SMPP account not found.",
      );
    }

    return account;
  }

  private generatePublicId(): string {
    return Buffer
      .from(
        this.random.bytes(10),
      )
      .toString("base64url")
      .slice(0, 20);
  }
}