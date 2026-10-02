import { z } from 'zod';
import { jsonField } from './common.schema';

/**
 * Validation des lettres de motivation.
 *
 * Les bornes hautes ne sont pas décoratives : une lettre de motivation tient
 * sur une page. Au-delà d'environ 2 800 caractères de corps, le PDF déborde
 * sur une seconde page et un recruteur arrête de lire. La limite est donc
 * posée ici, à l'entrée, plutôt que constatée à l'impression.
 */

/** Un paragraphe du corps : ni vide, ni interminable. */
const paragraph = z
  .string()
  .trim()
  .min(20, 'Un paragraphe de moins de 20 caractères n\'apporte rien, supprime-le.')
  .max(1200, 'Paragraphe trop long : découpe-le en deux.');

const bodyList = z
  .array(paragraph)
  .min(1, 'La lettre doit contenir au moins un paragraphe.')
  .max(6, 'Six paragraphes au maximum : au-delà, ce n\'est plus une lettre de motivation.')
  .refine(
    (list) => list.join(' ').length <= 2800,
    'Corps trop long pour tenir sur une page. Vise 1 500 à 2 200 caractères.'
  );

const coverLetterShape = {
  title: z
    .string()
    .trim()
    .min(3, 'Donne un nom reconnaissable à cette lettre.')
    .max(120),
  lang: z.enum(['fr', 'en']),
  company: z.string().trim().max(160).optional(),
  position: z.string().trim().max(160).optional(),
  recipient: z.string().trim().max(160).optional(),
  companyCity: z.string().trim().max(120).optional(),
  subject: z.string().trim().min(5, 'L\'objet est obligatoire.').max(200),
  salutation: z.string().trim().min(2, 'La formule d\'appel est obligatoire.').max(120),
  body: jsonField(bodyList),
  closing: z
    .string()
    .trim()
    .min(10, 'La formule de politesse est obligatoire.')
    .max(600),
  signature: z.string().trim().max(160).optional(),
  isDefault: z.coerce.boolean(),
  isArchived: z.coerce.boolean(),
};

export const createCoverLetterSchema = z.object({
  ...coverLetterShape,
  lang: coverLetterShape.lang.default('fr'),
  isDefault: coverLetterShape.isDefault.default(false),
  isArchived: coverLetterShape.isArchived.default(false),
});

/**
 * Aucun `.default()` sur la modification.
 *
 * C'est la même erreur que celle corrigée sur les projets à l'étape 3 :
 * `.partial()` ne retire pas les valeurs par défaut. Un PUT ne contenant que
 * le titre remettrait `lang` à "fr" et désarchiverait silencieusement la
 * lettre.
 */
export const updateCoverLetterSchema = z.object(coverLetterShape).partial();

/** Options de rendu passées en query sur /preview, /download et /render. */
export const renderQuerySchema = z.object({
  /**
   * Autorise l'impression malgré des variables non remplacées.
   * Par défaut le serveur refuse : envoyer une lettre contenant encore
   * « {{entreprise}} » est l'accident qui coûte la candidature.
   */
  force: z
    .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
});

/** Filtres de la liste administrable. */
export const listQuerySchema = z.object({
  archived: z
    .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  search: z.string().trim().max(120).optional(),
});

export type CreateCoverLetterInput = z.infer<typeof createCoverLetterSchema>;
export type UpdateCoverLetterInput = z.infer<typeof updateCoverLetterSchema>;
export type RenderQuery = z.infer<typeof renderQuerySchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
