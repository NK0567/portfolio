import { z } from 'zod';
import { jsonField, i18nText, i18nTextOptional } from './common.schema';

/** Forme de base sans défauts (voir l'explication dans project.schema.ts). */
const educationShape = {
  degree: jsonField(i18nText),
  school: z.string().min(1, "Le nom de l'établissement est obligatoire.").max(160).trim(),
  location: z.string().max(120).trim().optional(),
  startDate: z.coerce.date({ message: 'Date de début invalide.' }),
  endDate: z.coerce.date().nullable().optional(),
  isCurrent: z.coerce.boolean(),
  description: jsonField(i18nTextOptional),
  order: z.coerce.number().int().min(0),
};

export const createEducationSchema = z
  .object({
    ...educationShape,
    isCurrent: educationShape.isCurrent.default(false),
    description: educationShape.description.default({ fr: '', en: '' }),
    order: educationShape.order.default(0),
  })
  .refine((d) => !(d.isCurrent && d.endDate), {
    message: 'Une formation en cours ne peut pas avoir de date de fin.',
    path: ['endDate'],
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: 'La date de fin doit être postérieure à la date de début.',
    path: ['endDate'],
  });

export const updateEducationSchema = z.object(educationShape).partial();

export type CreateEducationInput = z.infer<typeof createEducationSchema>;
export type UpdateEducationInput = z.infer<typeof updateEducationSchema>;
