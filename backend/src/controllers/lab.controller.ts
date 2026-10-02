import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { createAuditLog } from '../utils/logger';
import { generateUniqueLabSlug } from '../utils/slug';
import { isAdminRequest } from '../middlewares/auth.middleware';
import { deleteUploadedFile } from '../middlewares/upload.middleware';
import { CreateLabInput, UpdateLabInput } from '../schemas/lab.schema';

const orderBy: Prisma.CyberLabOrderByWithRelationInput[] = [
  { order: 'asc' },
  { completedAt: 'desc' },
];

/**
 * GET /api/labs — liste.
 *
 * Route publique précédée de optionalAuth : l'administrateur connecté voit
 * aussi ses brouillons, le visiteur uniquement ce qui est publié. La liste
 * publique n'embarque pas le write-up complet, inutile pour des cartes.
 */
export const getAllLabs = async (req: Request, res: Response): Promise<void> => {
  const admin = isAdminRequest(req);

  const labs = await prisma.cyberLab.findMany({
    where: admin ? {} : { isPublished: true },
    orderBy,
    ...(admin ? {} : { omit: { content: true, remediation: true } }),
  });

  res.status(200).json({ success: true, count: labs.length, data: labs });
};

/**
 * GET /api/labs/:slug — détail.
 *
 * Un brouillon demandé par un visiteur renvoie 404, pas 403 : répondre
 * « interdit » confirmerait que l'adresse existe.
 */
export const getLabBySlug = async (req: Request, res: Response): Promise<void> => {
  const lab = await prisma.cyberLab.findUnique({ where: { slug: req.params.slug as string } });

  if (!lab || (!lab.isPublished && !isAdminRequest(req))) {
    throw AppError.notFound('Lab introuvable.');
  }

  res.status(200).json({ success: true, data: lab });
};

/** POST /api/labs — création (admin). */
export const createLab = async (req: Request, res: Response): Promise<void> => {
  const data = req.body as CreateLabInput;
  const slug = await generateUniqueLabSlug(data.title);

  const lab = await prisma.cyberLab.create({
    data: {
      slug,
      title: data.title,
      platform: data.platform,
      difficulty: data.difficulty,
      category: data.category ?? null,
      badgeUrl: data.badgeUrl ?? null,
      writeUpUrl: data.writeUpUrl ?? null,
      summary: data.summary,
      content: data.content,
      remediation: data.remediation,
      techniques: data.techniques,
      tools: data.tools,
      isPublished: data.isPublished,
      order: data.order,
      completedAt: data.completedAt,
    },
  });

  await createAuditLog(req, {
    action: 'LAB_CREATE',
    resource: 'CyberLab',
    details: { labId: lab.id, title: lab.title, published: lab.isPublished },
  });

  res.status(201).json({ success: true, data: lab });
};

/** PUT /api/labs/:id — modification (admin). Le slug ne change jamais. */
export const updateLab = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const data = req.body as UpdateLabInput;

  const existing = await prisma.cyberLab.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Lab introuvable.');

  // Même règle qu'à la création, évaluée sur l'état final et non sur le seul
  // contenu de la requête : publier sans renvoyer le write-up reste possible
  // s'il est déjà en base.
  const willBePublished = data.isPublished ?? existing.isPublished;
  const finalContent = (data.content ?? existing.content) as { fr?: string } | null;
  if (willBePublished && !finalContent?.fr?.trim()) {
    throw AppError.badRequest('Un lab publié doit avoir un write-up en français.');
  }

  const lab = await prisma.cyberLab.update({
    where: { id },
    data: {
      ...data,
      category: data.category === undefined ? undefined : data.category || null,
    },
  });

  if (data.badgeUrl !== undefined && existing.badgeUrl && existing.badgeUrl !== lab.badgeUrl) {
    deleteUploadedFile(existing.badgeUrl);
  }

  await createAuditLog(req, {
    action: existing.isPublished !== lab.isPublished
      ? (lab.isPublished ? 'LAB_PUBLISH' : 'LAB_UNPUBLISH')
      : 'LAB_UPDATE',
    resource: 'CyberLab',
    details: { labId: id, title: lab.title },
  });

  res.status(200).json({ success: true, data: lab });
};

/** DELETE /api/labs/:id — suppression (admin). */
export const deleteLab = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.cyberLab.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Lab introuvable.');

  await prisma.cyberLab.delete({ where: { id } });
  if (existing.badgeUrl) deleteUploadedFile(existing.badgeUrl);

  await createAuditLog(req, {
    action: 'LAB_DELETE',
    resource: 'CyberLab',
    details: { labId: id, title: existing.title },
  });

  res.status(200).json({ success: true, message: 'Lab supprimé.' });
};
