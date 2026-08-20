-- CreateTable
CREATE TABLE `outbox_events` (
    `id` CHAR(36) NOT NULL,
    `eventType` VARCHAR(100) NOT NULL,
    `aggregateType` VARCHAR(100) NOT NULL,
    `aggregateId` CHAR(36) NOT NULL,
    `queueName` VARCHAR(100) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'PUBLISHED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `publishedAt` DATETIME(3) NULL,
    `lastError` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `outbox_events_status_availableAt_idx`(`status`, `availableAt`),
    INDEX `outbox_events_aggregateType_aggregateId_idx`(`aggregateType`, `aggregateId`),
    INDEX `outbox_events_eventType_idx`(`eventType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
