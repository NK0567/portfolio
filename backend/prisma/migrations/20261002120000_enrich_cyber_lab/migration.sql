-- La table était vide au moment de cette migration : les colonnes NOT NULL
-- sans défaut (slug, content...) ne posent donc aucun problème.
-- Le nom `CyberLab` est écrit avec sa casse exacte : MySQL sous Linux y est sensible.

-- AlterTable
ALTER TABLE `CyberLab` ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `content` JSON NOT NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `order` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `remediation` JSON NOT NULL,
    ADD COLUMN `slug` VARCHAR(191) NOT NULL,
    ADD COLUMN `techniques` JSON NOT NULL,
    ADD COLUMN `tools` JSON NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `CyberLab_slug_key` ON `CyberLab`(`slug`);

-- CreateIndex
CREATE INDEX `CyberLab_isPublished_completedAt_idx` ON `CyberLab`(`isPublished`, `completedAt`);

