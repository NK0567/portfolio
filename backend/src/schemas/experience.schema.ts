import { z } from 'zod';
import { jsonField, i18nText, i18nList, imagePath } from './common.schema';

export const createExperienceSchema = z
  .object({
    company: z.string().min(1, "Le nom de l'entreprise est obligatoire.").max(120).trim(),
    logoUrl: imagePath.nullable().optional(),
    location: z.string().min(1, 'La localisation est obligatoire.').max(120).trim(),
    role: jsonField(i18nText),
    description: jsonField(i18nText),
    achievements: jsonField(i18nList).default({ fr: [], en: [] }),
    startDate: z.coerce.date({ message: 'Date de début invalide.' }),
    endDate: z.coerce.date().nullable().optional(),
    isCurrent: z.coerce.boolean().default(false),
    order: z.coerce.number().int().min(0).default(0),
  })
  // Deux incohérences que la base seule ne peut pas empêcher,
  // et qui produiraient une timeline absurde côté public.
  .refine((d) => !(d.isCurrent && d.endDate), {
    message: "Un poste en cours ne peut pas avoir de date de fin.",
    path: ['endDate'],
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: 'La date de fin doit être postérieure à la date de début.',
    path: ['endDate'],
  });

/**
 * `.partial()` n'existe pas sur un schéma déjà affiné (ZodEffects).
 * On repart donc de la forme de base pour la modification.
 */
const baseExperience = z.object({
  company: z.string().min(1).max(120).trim(),
  logoUrl: imagePath.nullable().optional(),
  location: z.string().min(1).max(120).trim(),
  role: jsonField(i18nText),
  description: jsonField(i18nText),
  achievements: jsonField(i18nList),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable(),
  isCurrent: z.coerce.boolean(),
  order: z.coerce.number().int().min(0),
});

export const updateExperienceSchema = baseExperience.partial();

export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;
export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;
