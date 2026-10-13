/**
 * Remplace les identifiants de l'administration par ceux du .env.
 *
 *   npm run admin:reset                                   (base locale)
 *   $env:TARGET_DATABASE_URL="mysql://..."; npm run admin:reset   (base en ligne)
 *
 * Lit SEED_ADMIN_EMAIL, SEED_ADMIN_USERNAME et SEED_ADMIN_PASSWORD, puis :
 *   1. garde UN seul compte administrateur, mis à jour avec ces identifiants ;
 *   2. supprime les autres comptes (anciens comptes de test, identifiants
 *      exposés...) : un compte oublié est une porte d'entrée oubliée ;
 *   3. ferme toutes les sessions ouvertes, sur tous les appareils.
 *
 * Le mot de passe n'est jamais affiché ; seul son hash bcrypt est stocké.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const url = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL;
const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const username = process.env.SEED_ADMIN_USERNAME?.trim();
const password = process.env.SEED_ADMIN_PASSWORD;

const fail = (message: string): never => {
  console.error(`[admin] ${message}`);
  process.exit(1);
};

if (!url) fail('Aucune base : DATABASE_URL ou TARGET_DATABASE_URL est requis.');
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('SEED_ADMIN_EMAIL manquant ou invalide dans .env.');
if (!username || username.length < 3) fail('SEED_ADMIN_USERNAME manquant (3 caractères minimum) dans .env.');
if (!password || password.length < 12) fail('SEED_ADMIN_PASSWORD manquant ou trop court (12 caractères minimum) dans .env.');

const prisma = new PrismaClient({ datasources: { db: { url } } });
const host = url!.replace(/^.*@([^:/]+).*$/, '$1');

const main = async () => {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['SUPERADMIN', 'ADMIN'] } },
    orderBy: { createdAt: 'desc' },
  });

  // Le compte conservé : celui qui porte déjà le nouvel e-mail, sinon le plus récent.
  const keep = admins.find((u) => u.email === email) ?? admins[0];
  const others = await prisma.user.findMany({ where: keep ? { id: { not: keep.id } } : {}, select: { id: true } });
  const passwordHash = await bcrypt.hash(password!, 12);

  await prisma.$transaction(async (tx) => {
    // Suppression d'abord : libère e-mail et nom d'utilisateur, tous deux uniques.
    if (others.length > 0) await tx.user.deleteMany({ where: { id: { in: others.map((o) => o.id) } } });
    await tx.session.deleteMany({});

    if (keep) {
      await tx.user.update({
        where: { id: keep.id },
        data: { email: email!, username: username!, passwordHash, role: 'SUPERADMIN' },
      });
    } else {
      await tx.user.create({ data: { email: email!, username: username!, passwordHash, role: 'SUPERADMIN' } });
    }
  });

  console.log(`[admin] Base : ${host}`);
  console.log(`[admin] Compte administrateur ${keep ? 'mis à jour' : 'créé'} : ${email}`);
  console.log(`[admin] Autres comptes supprimés : ${others.length}`);
  console.log('[admin] Toutes les sessions ont été fermées. Reconnecte-toi avec les nouveaux identifiants.');
};

main()
  .catch((error) => {
    console.error('[admin] Échec :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
