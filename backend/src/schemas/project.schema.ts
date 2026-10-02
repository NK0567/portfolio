import { z } from 'zod';
import {
  jsonField,
  i18nText,
  i18nTextOptional,
  i18nList,
  optionalUrl,
  imagePath,
  uuid,
} from './common.schema';

export const projectStatus = z.enum(['COMPLETED', 'DEVELOPMENT', 'MAINTENANCE', 'ARCHIVED']);

/**
 * Forme de base SANS valeurs par défaut.
 *
 * C'est le point clé : `.partial()` rend un champ facultatif mais
 * n'annule PAS son `.default()`. Un schéma de création réutilisé tel quel en
 * modification ferait donc revenir toutes les valeurs par défaut à chaque
 * PUT — un simple changement de titre réinitialiserait le statut, viderait
 * les fonctionnalités et effacerait toutes les compétences liées.
 * Les défauts sont donc appliqués UNIQUEMENT dans le schéma de création.
 */
const projectShape = {
  title: z
    .string()
    .min(3, 'Le titre doit contenir au moins 3 caractères.')
    .max(150, 'Le titre est trop long.')
    .trim(),

  description: jsonField(i18nText),
  content: jsonField(i18nTextOptional),

  // Rempli soit par le corps de la requête, soit par mapFileToBody après upload.
  mainImage: imagePath,
  images: jsonField(z.array(imagePath)),

  videoUrl: optionalUrl,
  githubUrl: optionalUrl,
  demoUrl: optionalUrl,
  documentation: z.string().max(50_000).optional(),

  status: projectStatus,

  architecture: jsonField(z.record(z.string(), z.unknown())),
  features: jsonField(i18nList),
  challenges: jsonField(i18nTextOptional),

  order: z.coerce.number().int().min(0),
  date: z.coerce.date({ message: 'Date invalide.' }),

  skillIds: jsonField(z.array(uuid)),
};

/** Création : les champs non fournis reçoivent une valeur par défaut sensée. */
export const createProjectSchema = z.object({
  ...projectShape,
  content: projectShape.content.default({ fr: '', en: '' }),
  images: projectShape.images.default([]),
  status: projectShape.status.default('DEVELOPMENT'),
  architecture: projectShape.architecture.default({}),
  features: projectShape.features.default({ fr: [], en: [] }),
  challenges: projectShape.challenges.default({ fr: '', en: '' }),
  order: projectShape.order.default(0),
  skillIds: projectShape.skillIds.default([]),
});

/**
 * Modification : tout est facultatif et RIEN n'est complété d'office.
 * Un champ absent du corps de la requête reste inchangé en base.
 *
 * Le slug est volontairement absent des deux schémas : il est dérivé du
 * titre à la création et ne bouge plus ensuite (voir utils/slug.ts).
 */
export const updateProjectSchema = z.object(projectShape).partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
