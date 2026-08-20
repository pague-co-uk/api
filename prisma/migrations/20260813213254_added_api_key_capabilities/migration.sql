-- CreateTable
CREATE TABLE `api_key_capabilities` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `module` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_key_capabilities_name_key`(`name`),
    INDEX `api_key_capabilities_module_idx`(`module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_key_capability_assignments` (
    `apiKeyId` CHAR(36) NOT NULL,
    `capabilityId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `api_key_capability_assignments_capabilityId_idx`(`capabilityId`),
    PRIMARY KEY (`apiKeyId`, `capabilityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `api_key_capability_assignments` ADD CONSTRAINT `api_key_capability_assignments_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `api_keys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_key_capability_assignments` ADD CONSTRAINT `api_key_capability_assignments_capabilityId_fkey` FOREIGN KEY (`capabilityId`) REFERENCES `api_key_capabilities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
