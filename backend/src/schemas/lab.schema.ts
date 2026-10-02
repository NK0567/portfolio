import { z } from 'zod';
import { jsonField, i18nText, i18nTextOptional, imagePath } from './common.schema';

export const LAB_PLATFORMS = ['HTB', 'TryHackMe', 'Root-Me', 'PortSwigger', 'VulnHub', 'Custom'] as const;
export const LAB_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Insane'] as const;

/** Liste de mots-clés : dédoublonnée, sans entrées vides, bornée. */
const tagList = jsonField(
  z
    .array(z.string().trim().min(1).max(60))
    .max(30, '30 éléments maximum.')
    .transform((items) => [...new Set(items)])
);

/**
 * Champ effaçable : la chaîne vide envoyée par un formulaire devient null,
 * pour qu'une modification puisse VIDER le champ. Avec undefined, Prisma
 * ignorerait la clé et l'ancienne valeur resterait en base.
 */
const clearable = <T extends z.ZodTypeAny>(inner: T) =>
  z
    .union([inner, z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : v));

/** Forme de base sans défauts (voir l'explication dans project.schema.ts). */
const labShape = {
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères.').max(150).trim(),
  platform: z.enum(LAB_PLATFORMS, { message: 'Plateforme inconnue.' }),
  difficulty: z.enum(LAB_DIFFICULTIES, { message: 'Difficulté inconnue.' }),
  category: z.string().max(60).trim().optional(),
  badgeUrl: clearable(imagePath),
  writeUpUrl: clearable(z.url('URL invalide.')),
  summary: jsonField(i18nText),
  content: jsonField(i18nTextOptional),
  remediation: jsonField(i18nTextOptional),
  techniques: tagList,
  tools: tagList,
  isPublished: z.coerce.boolean(),
  order: z.coerce.number().int().min(0),
  completedAt: z.coerce.date({ message: 'Date invalide.' }),
};

export const createLabSchema = z
  .object({
    ...labShape,
    content: labShape.content.default({ fr: '', en: '' }),
    remediation: labShape.remediation.default({ fr: '', en: '' }),
    techniques: labShape.techniques.default([]),
    tools: labShape.tools.default([]),
    isPublished: labShape.isPublished.default(false),
    order: labShape.order.default(0),
  })
  .refine((d) => !d.isPublished || d.content.fr.trim().length > 0, {
    message: 'Un lab publié doit avoir un write-up en français.',
    path: ['content'],
  });

export const updateLabSchema = z.object(labShape).partial();

export type CreateLabInput = z.infer<typeof createLabSchema>;
export type UpdateLabInput = z.infer<typeof updateLabSchema>;
