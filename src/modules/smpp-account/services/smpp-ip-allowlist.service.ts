import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { SmppAccountIpAllowlistRepository } from "../../../repositories/smppAccountIpAllowlistRepository.js";

@Injectable()
export class SmppIpAllowlistService {
  constructor(
    private readonly allowlist:
      SmppAccountIpAllowlistRepository,
  ) { }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findByAccount(
    smppAccountId: string,
  ) {
    return this.allowlist.findByAccount(
      smppAccountId,
    );
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async add(
    smppAccountId: string,
    ipAddress: string,
  ) {
    const normalizedIp =
      this.normalizeIpAddress(
        ipAddress,
      );

    const existing =
      await this.allowlist.findByAccountAndIp(
        smppAccountId,
        normalizedIp,
      );

    if (existing) {
      throw new ConflictException(
        "This IP address is already allowlisted for the SMPP account.",
      );
    }

    try {
      return await this.allowlist.create({
        smppAccount: {
          connect: {
            id: smppAccountId,
          },
        },

        ipAddress:
          normalizedIp,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "This IP address is already allowlisted for the SMPP account.",
        );
      }

      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async remove(
    smppAccountId: string,
    id: string,
  ) {
    const entry =
      await this.allowlist.findById(
        id,
      );

    if (
      !entry ||
      entry.smppAccountId !==
      smppAccountId
    ) {
      throw new NotFoundException(
        "SMPP account IP allowlist entry not found.",
      );
    }

    return this.allowlist.delete(
      entry.id,
    );
  }

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  isAllowed(
    remoteAddress: string,
    allowedAddresses: readonly string[],
  ): boolean {
    const normalizedRemoteAddress =
      this.normalizeIpAddress(
        remoteAddress,
      );

    /*
     * An SMPP account with no configured
     * allowlist entries is denied by default.
     */
    if (
      allowedAddresses.length === 0
    ) {
      return false;
    }

    return allowedAddresses.some(
      (address) =>
        this.normalizeIpAddress(
          address,
        ) === normalizedRemoteAddress,
    );
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private normalizeIpAddress(
    ipAddress: string,
  ): string {
    return ipAddress
      .trim()
      .replace(
        /^::ffff:/i,
        "",
      );
  }
}