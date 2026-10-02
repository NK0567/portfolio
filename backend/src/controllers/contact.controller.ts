import { Request, Response } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { createAuditLog, getClientIp } from '../utils/logger';
import { getValidatedQuery } from '../middlewares/validate.middleware';
import type {
  CreateContactMessageInput,
  ListMessagesQuery,
  UpdateMessageInput,
} from '../schemas/contact.schema';

/**
 * POST /api/contact : public.
 *
 * Le message est enregistré, rien n'est envoyé par e-mail. C'est volontaire :
 * brancher un SMTP ici ajouterait une dépendance externe qui peut tomber, et
 * un échec d'envoi ferait échouer une requête dont la partie utile a déjà
 * réussi. Les messages se lisent dans l'administration. L'envoi d'une
 * notification pourra se greffer plus tard, en tâche de fond.
 */
export const createContactMessage = async (req: Request, res: Response): Promise<void> => {
  const data = req.body as CreateContactMessageInput;

  const message = await prisma.contactMessage.create({
    data: {
      name: data.name,
      email: data.email,
      subject: data.subject ?? null,
      message: data.message,
      ipAddress: getClientIp(req),
    },
  });

  /*
   * La réponse ne renvoie pas le message enregistré. Un inconnu n'a pas besoin
   * de son identifiant en base, et le lui donner ouvre une surface inutile.
   */
  res.status(201).json({
    success: true,
    message: 'Message reçu. Je reviens vers toi rapidement.',
    data: { id: message.id },
  });
};

/** GET /api/contact : administration, paginé. */
export const listContactMessages = async (_req: Request, res: Response): Promise<void> => {
  const { page, limit, unreadOnly } = getValidatedQuery<ListMessagesQuery>(res);

  const where = unreadOnly ? { isRead: false } : {};

  const [total, unread, messages] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.status(200).json({
    success: true,
    count: messages.length,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    unread,
    data: messages,
  });
};

/** PATCH /api/contact/:id : marquer lu ou non lu. */
export const updateContactMessage = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { isRead } = req.body as UpdateMessageInput;

  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Message introuvable.');

  const message = await prisma.contactMessage.update({ where: { id }, data: { isRead } });

  res.status(200).json({ success: true, data: message });
};

/** DELETE /api/contact/:id */
export const deleteContactMessage = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Message introuvable.');

  await prisma.contactMessage.delete({ where: { id } });

  await createAuditLog(req, {
    action: 'CONTACT_MESSAGE_DELETE',
    resource: 'ContactMessage',
    details: { messageId: id, from: existing.email },
  });

  res.status(200).json({ success: true, message: 'Message supprimé.' });
};
