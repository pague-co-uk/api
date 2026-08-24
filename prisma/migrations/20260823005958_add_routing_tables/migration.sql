/*
  Warnings:

  - You are about to drop the `message_attempts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `message_attempts` DROP FOREIGN KEY `message_attempts_messageId_fkey`;

-- DropForeignKey
ALTER TABLE `message_status_events` DROP FOREIGN KEY `message_status_events_attemptId_fkey`;

-- AlterTable
ALTER TABLE `messages` ADD COLUMN `currentAttemptNumber` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `routingStatus` ENUM('PENDING', 'ROUTING', 'SUBMITTED', 'FAILED', 'UNKNOWN') NOT NULL DEFAULT 'PENDING',
    MODIFY `submittedAt` DATETIME(3) NULL;

-- DropTable
DROP TABLE `message_attempts`;

-- CreateTable
CREATE TABLE `message_route_attempts` (
    `id` CHAR(36) NOT NULL,
    `messageId` CHAR(36) NOT NULL,
    `routeId` CHAR(36) NOT NULL,
    `connectorId` CHAR(36) NOT NULL,
    `attemptNumber` INTEGER NOT NULL,
    `priority` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'DISPATCHED', 'SUBMITTING', 'SUBMITTED', 'FAILED', 'UNKNOWN') NOT NULL DEFAULT 'PENDING',
    `providerMessageId` VARCHAR(100) NULL,
    `errorCode` VARCHAR(50) NULL,
    `errorMessage` VARCHAR(255) NULL,
    `dispatchedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `message_route_attempts_messageId_idx`(`messageId`),
    INDEX `message_route_attempts_routeId_idx`(`routeId`),
    INDEX `message_route_attempts_connectorId_idx`(`connectorId`),
    INDEX `message_route_attempts_status_idx`(`status`),
    INDEX `message_route_attempts_providerMessageId_idx`(`providerMessageId`),
    UNIQUE INDEX `message_route_attempts_messageId_attemptNumber_key`(`messageId`, `attemptNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mobile_networks` (
    `id` CHAR(36) NOT NULL,
    `publicId` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `countryCode` CHAR(2) NOT NULL,
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mobile_networks_publicId_key`(`publicId`),
    UNIQUE INDEX `mobile_networks_code_key`(`code`),
    INDEX `mobile_networks_countryCode_idx`(`countryCode`),
    INDEX `mobile_networks_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mobile_network_prefixes` (
    `id` CHAR(36) NOT NULL,
    `mobileNetworkId` CHAR(36) NOT NULL,
    `prefix` VARCHAR(20) NOT NULL,
    `countryCode` CHAR(2) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mobile_network_prefixes_mobileNetworkId_idx`(`mobileNetworkId`),
    INDEX `mobile_network_prefixes_prefix_idx`(`prefix`),
    INDEX `mobile_network_prefixes_enabled_idx`(`enabled`),
    UNIQUE INDEX `mobile_network_prefixes_countryCode_prefix_key`(`countryCode`, `prefix`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `connectors` (
    `id` CHAR(36) NOT NULL,
    `publicId` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `provider` VARCHAR(100) NOT NULL,
    `transport` ENUM('SMPP', 'HTTP') NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `configuration` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `connectors_publicId_key`(`publicId`),
    UNIQUE INDEX `connectors_code_key`(`code`),
    INDEX `connectors_provider_idx`(`provider`),
    INDEX `connectors_transport_idx`(`transport`),
    INDEX `connectors_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `routes` (
    `id` CHAR(36) NOT NULL,
    `publicId` VARCHAR(20) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `mobileNetworkId` CHAR(36) NOT NULL,
    `connectorId` CHAR(36) NOT NULL,
    `priority` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `routes_publicId_key`(`publicId`),
    INDEX `routes_clientId_idx`(`clientId`),
    INDEX `routes_mobileNetworkId_idx`(`mobileNetworkId`),
    INDEX `routes_connectorId_idx`(`connectorId`),
    INDEX `routes_status_idx`(`status`),
    INDEX `routes_clientId_mobileNetworkId_status_priority_idx`(`clientId`, `mobileNetworkId`, `status`, `priority`),
    UNIQUE INDEX `routes_clientId_mobileNetworkId_priority_key`(`clientId`, `mobileNetworkId`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `messages_routingStatus_idx` ON `messages`(`routingStatus`);

-- AddForeignKey
ALTER TABLE `message_route_attempts` ADD CONSTRAINT `message_route_attempts_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_route_attempts` ADD CONSTRAINT `message_route_attempts_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_route_attempts` ADD CONSTRAINT `message_route_attempts_connectorId_fkey` FOREIGN KEY (`connectorId`) REFERENCES `connectors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_status_events` ADD CONSTRAINT `message_status_events_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `message_route_attempts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mobile_network_prefixes` ADD CONSTRAINT `mobile_network_prefixes_mobileNetworkId_fkey` FOREIGN KEY (`mobileNetworkId`) REFERENCES `mobile_networks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_mobileNetworkId_fkey` FOREIGN KEY (`mobileNetworkId`) REFERENCES `mobile_networks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_connectorId_fkey` FOREIGN KEY (`connectorId`) REFERENCES `connectors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
