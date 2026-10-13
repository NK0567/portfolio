/**
 * Copie en base les fichiers restés dans public/uploads.
 *
 *   npm run uploads:import
 *
 * À lancer une fois, avant de passer sur un hébergement dont le disque est
 * effacé à chaque redémarrage. Les fichiers déjà en base sont ignorés : le
 * script peut être relancé sans risque.
 */
import fs from 'fs';
import path from 'path';
import prisma from '../src/config/db';
import { LEGACY_UPLOAD_DIR } from '../src/utils/file-store';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

const main = async () => {
  const names = fs.existsSync(LEGACY_UPLOAD_DIR)
    ? fs.readdirSync(LEGACY_UPLOAD_DIR).filter((n) => !n.startsWith('.'))
    : [];

  let imported = 0;
  for (const filename of names) {
    const mimeType = MIME[path.extname(filename).toLowerCase()];
    if (!mimeType) {
      console.log(`  ignoré (type inconnu) : ${filename}`);
      continue;
    }
    const exists = await prisma.storedFile.findUnique({ where: { filename }, select: { filename: true } });
    if (exists) continue;

    const data = fs.readFileSync(path.join(LEGACY_UPLOAD_DIR, filename));
    await prisma.storedFile.create({ data: { filename, mimeType, size: data.length, data } });
    imported += 1;
    console.log(`  importé : ${filename}`);
  }

  console.log(`[uploads] ${imported} fichier(s) copié(s) en base sur ${names.length}.`);
  await prisma.$disconnect();
};

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
