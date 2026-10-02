import { z } from 'zod';
import { jsonField, i18nTextOptional, imagePath } from './common.schema';

const titlesShape = z.object({
  fr: z.array(z.string()).default([]),
  en: z.array(z.string()).default([]),
});

/** Forme de base sans défauts (voir l'explication dans project.schema.ts). */
const profileShape = {
  firstName: z.string().min(1, 'Le prénom est obligatoire.').max(60).trim(),
  lastName: z.string().min(1, 'Le nom est obligatoire.').max(60).trim(),
  avatarUrl: imagePath.optional(),
  cvUrlFr: imagePath.optional(),
  cvUrlEn: imagePath.optional(),
  bio: jsonField(i18nTextOptional),
  // Titres défilants du hero : { fr: ["Ingénieur logiciel", ...], en: [...] }
  titles: jsonField(titlesShape),

  /* --- Coordonnées imprimées sur le CV généré --- */
  email: z.union([z.email('Adresse email invalide.'), z.literal('')]).optional(),
  phone: z.string().max(40).optional(),
  phoneAlt: z.string().max(40).optional(),
  location: z.string().max(120).optional(),
  birthDate: z.coerce.date().nullable().optional(),
  /** Libellé sous le nom sur le CV : { fr: "Développeur Full-Stack", en: "..." } */
  headline: jsonField(i18nTextOptional),
  /** [{ name: "Français", level: "courant" }] */
  languages: jsonField(
    z.array(z.object({ name: z.string().min(1), level: z.string().min(1) }))
  ),
  /** Centres d'intérêt : { fr: [...], en: [...] } */
  interests: jsonField(titlesShape),
};

/** Première configuration : prénom et nom obligatoires. */
export const upsertProfileSchema = z.object({
  ...profileShape,
  bio: profileShape.bio.default({ fr: '', en: '' }),
  titles: profileShape.titles.default({ fr: [], en: [] }),
  headline: profileShape.headline.default({ fr: '', en: '' }),
  languages: profileShape.languages.default([]),
  interests: profileShape.interests.default({ fr: [], en: [] }),
});

/**
 * Mise à jour partielle : sans cette version sans défauts, modifier
 * uniquement le prénom écraserait la biographie avec une chaîne vide.
 */
export const patchProfileSchema = z.object(profileShape).partial();

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>;
