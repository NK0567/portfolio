import dotenv from 'dotenv';
import { z } from 'zod';

// Charge le .env AVANT toute lecture de process.env
dotenv.config();

/**
 * Schéma de validation des variables d'environnement.
 *
 * Objectif : si une variable critique manque ou est trop faible,
 * le serveur refuse de démarrer avec un message clair.
 * C'est infiniment préférable à un secret de repli codé en dur,
 * qui rendrait tous les jetons forgeables par quiconque lit le code source.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL est obligatoire.'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET doit faire au moins 32 caractères (openssl rand -hex 64).'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET doit faire au moins 32 caractères (openssl rand -hex 64).'),

  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().default(7),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Nombre de proxies devant l'API (voir app.ts). 1 par défaut.
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),

  // Utilisés uniquement par prisma/seed.ts
  SEED_ADMIN_EMAIL: z.string().optional(),
  SEED_ADMIN_USERNAME: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n[env] Configuration invalide. Corrige ton fichier .env :\n');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')} : ${issue.message}`);
  }
  console.error('');
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';

/**
 * Les deux secrets JWT doivent être différents.
 * S'ils sont identiques, un access token pourrait être présenté
 * comme refresh token (et inversement).
 */
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
  console.error('[env] JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent être différents.');
  process.exit(1);
}

/**
 * Origines autorisées par CORS.
 * Accepte une liste séparée par des virgules :
 *   CORS_ORIGIN=http://localhost:3000,https://monportfolio.com
 */
export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
