import { z } from 'zod';
import { jsonField, i18nTextOptional, imagePath } from './common.schema';

export const skillCategory = z.enum([
  'FRONTEND',
  'BACKEND',
  'MOBILE',
  'CLOUD',
  'CYBERSECURITY',
  'DEVOPS',
  'DATABASE',
  'OTHER',
]);

/** Forme de base sans défauts (voir l'explication dans project.schema.ts). */
const skillShape = {
  name: z.string().min(1, 'Le nom est obligatoire.').max(60).trim(),
  category: skillCategory,
  level: z.coerce
    .number()
    .int()
    .min(0, 'Le niveau va de 0 à 100.')
    .max(100, 'Le niveau va de 0 à 100.'),
  yearsOfExp: z.coerce.number().int().min(0).max(60),
  logoUrl: imagePath.optional(),
  description: jsonField(i18nTextOptional),
  order: z.coerce.number().int().min(0),
};

export const createSkillSchema = z.object({
  ...skillShape,
  description: skillShape.description.default({ fr: '', en: '' }),
  order: skillShape.order.default(0),
});

export const updateSkillSchema = z.object(skillShape).partial();

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
