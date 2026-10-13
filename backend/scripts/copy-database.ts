/**
 * Copie le contenu de la base locale vers la base en ligne.
 *
 *   PowerShell :
 *     $env:TARGET_DATABASE_URL="mysql://...@...:4000/portfolio?sslaccept=strict"
 *     npm run db:copy
 *
 * La source est la base de backend/.env (DATABASE_URL). La cible doit déjà
 * avoir ses tables (npx prisma migrate deploy, voir DEPLOIEMENT-GRATUIT.md).
 *
 * Tout est copié, compte administrateur compris (même e-mail, même mot de
 * passe), sauf les sessions, le journal d'audit et les statistiques, qui
 * n'ont pas de sens hors de la machine d'origine. Les lignes déjà présentes
 * dans la cible sont ignorées : le script peut être relancé sans doublon.
 */
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const sourceUrl = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;

if (!sourceUrl || !targetUrl) {
  console.error('[copie] Il faut DATABASE_URL (source, dans .env) et TARGET_DATABASE_URL (cible).');
  process.exit(1);
}
if (sourceUrl === targetUrl) {
  console.error('[copie] La source et la cible sont identiques : rien à faire.');
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });

/** Les valeurs null sont retirées : la colonne prend son défaut (NULL), ce que Prisma exige pour les champs JSON. */
const clean = <T extends Record<string, unknown>>(row: T) =>
  Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null)) as T;

type Delegate = {
  findMany: () => Promise<Record<string, unknown>[]>;
  createMany: (args: { data: Record<string, unknown>[]; skipDuplicates: boolean }) => Promise<{ count: number }>;
};

/** Ordre imposé par les clés étrangères : les parents avant les enfants. */
const MODELS = [
  'user',
  'globalConfig',
  'profile',
  'education',
  'skill',
  'project',
  'projectSkill',
  'experience',
  'certification',
  'cyberLab',
  'service',
  'blogPost',
  'contactMessage',
  'coverLetter',
  'storedFile',
] as const;

const main = async () => {
  for (const model of MODELS) {
    const from = (source as unknown as Record<string, Delegate>)[model]!;
    const to = (target as unknown as Record<string, Delegate>)[model]!;
    const rows = await from.findMany();

    if (rows.length === 0) {
      console.log(`  ${model.padEnd(15)} vide`);
      continue;
    }

    // Les fichiers sont envoyés un par un : une image pèse jusqu'à 5 Mo, et
    // un seul lot de plusieurs fichiers dépasserait la taille de requête admise.
    if (model === 'storedFile') {
      let count = 0;
      for (const row of rows) count += (await to.createMany({ data: [clean(row)], skipDuplicates: true })).count;
      console.log(`  ${model.padEnd(15)} ${count} copié(s) sur ${rows.length}`);
      continue;
    }

    const { count } = await to.createMany({ data: rows.map(clean), skipDuplicates: true });
    console.log(`  ${model.padEnd(15)} ${count} copié(s) sur ${rows.length}`);
  }
  console.log('[copie] Terminé.');
};

main()
  .catch((error) => {
    console.error('[copie] Échec :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
