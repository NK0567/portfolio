import { z } from 'zod';

/**
 * Champ JSON tolérant au multipart/form-data.
 *
 * En `application/json`, la valeur arrive déjà parsée.
 * En `multipart/form-data` (dès qu'il y a un fichier), TOUT arrive en
 * chaîne de caractères : `{"fr":"..."}` est un string, pas un objet.
 * Ce helper tente le JSON.parse puis laisse Zod valider la forme.
 *
 * L'ancienne version du code faisait ce parsing dans le contrôleur avec un
 * `catch {}` silencieux : un JSON malformé était alors stocké tel quel en
 * base, et le bug ne se manifestait qu'au frontend, des semaines plus tard.
 * Ici, un JSON invalide produit une erreur 422 immédiate et explicite.
 */
export const jsonField = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (trimmed === '') return undefined;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value; // Zod rejettera la chaîne et signalera le champ
    }
  }, inner);

/** Texte bilingue obligatoire : { fr: "...", en: "..." } */
export const i18nText = z.object({
  fr: z.string().min(1, 'Le texte français est obligatoire.'),
  en: z.string().min(1, "Le texte anglais est obligatoire."),
});

/** Texte bilingue optionnel (les deux langues peuvent être vides). */
export const i18nTextOptional = z.object({
  fr: z.string().default(''),
  en: z.string().default(''),
});

/** Liste bilingue : { fr: ["..."], en: ["..."] } */
export const i18nList = z.object({
  fr: z.array(z.string()).default([]),
  en: z.array(z.string()).default([]),
});

/** URL optionnelle acceptant la chaîne vide envoyée par les formulaires HTML. */
export const optionalUrl = z
  .union([z.url('URL invalide.'), z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

/** Chemin interne (/uploads/xxx.jpg) ou URL absolue. */
export const imagePath = z
  .string()
  .min(1)
  .refine(
    (v) => v.startsWith('/uploads/') || /^https?:\/\//.test(v),
    'Doit être un chemin /uploads/... ou une URL absolue.'
  );

/** Identifiant UUID tel que généré par Prisma. */
export const uuid = z.uuid('Identifiant invalide.');

/** Pagination réutilisable pour toutes les listes administrables. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;
