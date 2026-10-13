-- CreateTable
CREATE TABLE `StoredFile` (
    `filename` VARCHAR(80) NOT NULL,
    `mimeType` VARCHAR(80) NOT NULL,
    `size` INTEGER NOT NULL,
    `data` MEDIUMBLOB NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`filename`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

