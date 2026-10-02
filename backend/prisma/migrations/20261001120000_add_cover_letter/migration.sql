-- CreateTable
CREATE TABLE `CoverLetter` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `lang` VARCHAR(191) NOT NULL DEFAULT 'fr',
    `company` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `recipient` VARCHAR(191) NULL,
    `companyCity` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `salutation` VARCHAR(191) NOT NULL,
    `body` JSON NOT NULL,
    `closing` TEXT NOT NULL,
    `signature` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CoverLetter_isArchived_updatedAt_idx`(`isArchived`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
