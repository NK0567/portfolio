import { z } from 'zod';
import { paginationSchema } from './common.schema';

/**
 * Formulaire de contact public.
 *
 * Seule route d'écriture ouverte à un inconnu dans toute l'API. Les bornes
 * sont donc serrées, et le piège à robots ci-dessous est traité ici plutôt
 * que dans le contrôleur.
 */

export const createContactMessageSchema = z
  .object({
    name: z.string().trim().min(2, 'Ton nom est obligatoire.').max(120),
    email: z.email('Adresse e-mail invalide.').max(200),
    subject: z.string().trim().max(200).optional(),
    message: z
      .string()
      .trim()
      .min(20, 'Décris ta demande en quelques phrases.')
      .max(4000, 'Message trop long. Va à l\'essentiel, on en parlera de vive voix.'),

    /*
     * Champ piège, invisible pour un humain via CSS. Un robot remplit tous les
     * champs qu'il trouve, un visiteur ne peut pas remplir celui-là. On rejette
     * donc la soumission s'il contient quoi que ce soit.
     *
     * Choisi plutôt qu'un captcha : aucun service tiers, aucune donnée du
     * visiteur envoyée ailleurs, aucune image à déchiffrer. Ça n'arrête pas un
     * robot écrit sur mesure, mais ça arrête la quasi-totalité du spam de
     * masse, qui est le seul problème réel sur un portfolio.
     */
    website: z.string().max(0, 'Requête rejetée.').optional(),
  })
  .strict();

export const listMessagesQuerySchema = paginationSchema.extend({
  unreadOnly: z
    .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
});

export const updateMessageSchema = z.object({
  isRead: z.coerce.boolean(),
});

export type CreateContactMessageInput = z.infer<typeof createContactMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
