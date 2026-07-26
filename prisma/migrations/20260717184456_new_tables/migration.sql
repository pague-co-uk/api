/*
  Warnings:

  - You are about to drop the column `keyHash` on the `api_keys` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenHash]` on the table `refresh_tokens` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `secretHash` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authenticationMethod` to the `authentication_events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `api_keys` DROP COLUMN `keyHash`,
    ADD COLUMN `secretHash` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `authentication_events` ADD COLUMN `authenticationMethod` ENUM('PASSWORD', 'API_KEY', 'REFRESH_TOKEN', 'SESSION', 'SMPP', 'SYSTEM') NOT NULL;

-- AlterTable
ALTER TABLE `clients` MODIFY `timezone` VARCHAR(64) NOT NULL DEFAULT 'Europe/London';

-- AlterTable
ALTER TABLE `portal_sessions` ADD COLUMN `authenticatedWithMfa` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `trustedDeviceId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lockedUntil` DATETIME(3) NULL,
    ADD COLUMN `mfaEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `phone` VARCHAR(30) NULL,
    ADD COLUMN `phoneVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `preferredMfaMethod` ENUM('EMAIL', 'SMS') NULL;

-- CreateTable
CREATE TABLE `verification_challenges` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `codeHash` VARCHAR(255) NOT NULL,
    `purpose` ENUM('LOGIN', 'PASSWORD_RESET', 'EMAIL_VERIFICATION', 'PHONE_VERIFICATION') NOT NULL,
    `channel` ENUM('EMAIL', 'SMS') NOT NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'EXPIRED', 'CANCELLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `verification_challenges_userId_idx`(`userId`),
    INDEX `verification_challenges_expiresAt_idx`(`expiresAt`),
    INDEX `verification_challenges_status_idx`(`status`),
    INDEX `verification_challenges_userId_purpose_idx`(`userId`, `purpose`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trusted_devices` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `deviceId` VARCHAR(64) NOT NULL,
    `deviceName` VARCHAR(255) NULL,
    `userAgent` VARCHAR(512) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastUsedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trusted_devices_deviceId_key`(`deviceId`),
    INDEX `trusted_devices_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `portal_sessions_trustedDeviceId_idx` ON `portal_sessions`(`trustedDeviceId`);

-- CreateIndex
CREATE UNIQUE INDEX `refresh_tokens_tokenHash_key` ON `refresh_tokens`(`tokenHash`);

-- AddForeignKey
ALTER TABLE `verification_challenges` ADD CONSTRAINT `verification_challenges_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trusted_devices` ADD CONSTRAINT `trusted_devices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portal_sessions` ADD CONSTRAINT `portal_sessions_trustedDeviceId_fkey` FOREIGN KEY (`trustedDeviceId`) REFERENCES `trusted_devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
