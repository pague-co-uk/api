import { Inject, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient, VerificationChannel, VerificationPurpose, VerificationStatus } from "@prisma/client";

import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";

@Injectable()
export class VerificationChallengeRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new VerificationChallengeRepository(
      db,
    ) as this;
  }

  create(data: Prisma.VerificationChallengeCreateInput) {
    return this.db.verificationChallenge.create({
      data,
    });
  }

  findById(id: string) {
    return this.db.verificationChallenge.findUnique({
      where: { id },
    });
  }

  findPending(
    userId: string,
    purpose: VerificationPurpose,
    channel: VerificationChannel,
  ) {
    return this.db.verificationChallenge.findFirst({
      where: {
        userId,
        purpose,
        channel,
        status: VerificationStatus.PENDING,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findPendingForUser(
    userId: string,
    purpose: VerificationPurpose,
    channel: VerificationChannel
  ) {
    return this.db.verificationChallenge.findFirst({
      where: {
        userId,
        purpose,
        channel,
        status: VerificationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  incrementAttempts(id: string) {
    return this.db.verificationChallenge.update({
      where: { id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  markVerified(id: string) {
    return this.updateStatus(
      id,
      VerificationStatus.VERIFIED,
      new Date(),
    );
  }

  markFailed(id: string) {
    return this.updateStatus(
      id,
      VerificationStatus.FAILED,
    );
  }

  markExpired(id: string) {
    return this.updateStatus(
      id,
      VerificationStatus.EXPIRED,
      new Date(),
    );
  }

  cancel(id: string) {
    return this.db.verificationChallenge.update({
      where: { id },
      data: {
        status: VerificationStatus.CANCELLED,
      },
    });
  }

  deleteExpired() {
    return this.db.verificationChallenge.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  cancelPending(
    userId: string,
    purpose: VerificationPurpose,
    channel: VerificationChannel,
  ) {
    return this.db.verificationChallenge.updateMany({
      where: {
        userId,
        purpose,
        channel,
        status: VerificationStatus.PENDING,
      },
      data: {
        status: VerificationStatus.CANCELLED,
      },
    });
  }

  private updateStatus(
    id: string,
    status: VerificationStatus,
    verifiedAt?: Date,
  ) {
    return this.db.verificationChallenge.update({
      where: { id },
      data: {
        status,
        verifiedAt,
      },
    });
  }
}