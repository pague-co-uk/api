import { Inject, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";

@Injectable()
export class TrustedDeviceRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db:
      | PrismaClient
      | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new TrustedDeviceRepository(
      db,
    ) as this;
  }

  create(
    data: Prisma.TrustedDeviceCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "trusted_devices",
      async () => ({
        result: await this.db.trustedDevice.create({
          data,
        }),
        rowsAffected: 1,
      }),
    );
  }

  findById(id: string) {
    return this.execute(
      "SELECT",
      "trusted_devices",
      async () => {
        const device =
          await this.db.trustedDevice.findUnique({
            where: { id },
          });

        return {
          result: device,
          rowsAffected: device ? 1 : 0,
        };
      },
    );
  }

  findByDeviceId(deviceId: string) {
    return this.execute(
      "SELECT",
      "trusted_devices",
      async () => {
        const device =
          await this.db.trustedDevice.findUnique({
            where: {
              deviceId,
            },
          });

        return {
          result: device,
          rowsAffected: device ? 1 : 0,
        };
      },
    );
  }

  findForUser(userId: string) {
    return this.execute(
      "SELECT",
      "trusted_devices",
      async () => {
        const devices =
          await this.db.trustedDevice.findMany({
            where: {
              userId,
            },
            orderBy: {
              lastUsedAt: "desc",
            },
          });

        return {
          result: devices,
          rowsAffected: devices.length,
        };
      },
    );
  }

  findActiveForUser(userId: string) {
    return this.execute(
      "SELECT",
      "trusted_devices",
      async () => {
        const devices =
          await this.db.trustedDevice.findMany({
            where: {
              userId,
              expiresAt: {
                gt: new Date(),
              },
            },
            orderBy: {
              lastUsedAt: "desc",
            },
          });

        return {
          result: devices,
          rowsAffected: devices.length,
        };
      },
    );
  }

  updateLastUsed(
    id: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    return this.execute(
      "UPDATE",
      "trusted_devices",
      async () => ({
        result:
          await this.db.trustedDevice.update({
            where: { id },
            data: {
              lastUsedAt: new Date(),
              ...(userAgent && {
                userAgent,
              }),
              ...(ipAddress && {
                ipAddress,
              }),
            },
          }),
        rowsAffected: 1,
      }),
    );
  }

  update(
    id: string,
    data: Prisma.TrustedDeviceUpdateInput,
  ) {
    return this.execute(
      "UPDATE",
      "trusted_devices",
      async () => ({
        result:
          await this.db.trustedDevice.update({
            where: { id },
            data,
          }),
        rowsAffected: 1,
      }),
    );
  }

  delete(id: string) {
    return this.execute(
      "DELETE",
      "trusted_devices",
      async () => ({
        result:
          await this.db.trustedDevice.delete({
            where: { id },
          }),
        rowsAffected: 1,
      }),
    );
  }

  deleteExpired() {
    return this.execute(
      "DELETE",
      "trusted_devices",
      async () => {
        const result =
          await this.db.trustedDevice.deleteMany({
            where: {
              expiresAt: {
                lt: new Date(),
              },
            },
          });

        return {
          result,
          rowsAffected: result.count,
        };
      },
    );
  }
}