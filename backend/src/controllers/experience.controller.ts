import { Request, Response } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { createAuditLog } from '../utils/logger';
import { CreateExperienceInput, UpdateExperienceInput } from '../schemas/experience.schema';

/** POST /api/experiences — création (admin) */
export const createExperience = async (req: Request, res: Response): Promise<void> => {
  const data = req.body as CreateExperienceInput;

  const experience = await prisma.experience.create({
    data: {
      company: data.company,
      logoUrl: data.logoUrl ?? null,
      location: data.location,
      role: data.role,
      description: data.description,
      achievements: data.achievements,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      isCurrent: data.isCurrent,
      order: data.order,
    },
  });

  await createAuditLog(req, {
    action: 'EXPERIENCE_CREATE',
    resource: 'Experience',
    details: { experienceId: experience.id, company: experience.company },
  });

  res.status(201).json({ success: true, data: experience });
};

/** GET /api/experiences — liste publique, la plus récente en premier */
export const getAllExperiences = async (_req: Request, res: Response): Promise<void> => {
  const experiences = await prisma.experience.findMany({
    orderBy: [{ order: 'asc' }, { startDate: 'desc' }],
  });

  res.status(200).json({ success: true, count: experiences.length, data: experiences });
};

/** PUT /api/experiences/:id — modification (admin) */
export const updateExperience = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const data = req.body as UpdateExperienceInput;

  const existing = await prisma.experience.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Expérience introuvable.');

  // La cohérence début/fin doit tenir compte des valeurs déjà en base,
  // puisqu'une modification partielle peut ne toucher qu'une seule des deux dates.
  const startDate = data.startDate ?? existing.startDate;
  const endDate = data.endDate === undefined ? existing.endDate : data.endDate;

  if (endDate && endDate < startDate) {
    throw AppError.badRequest('La date de fin doit être postérieure à la date de début.');
  }

  const experience = await prisma.experience.update({
    where: { id },
    data: { ...data, startDate, endDate },
  });

  await createAuditLog(req, {
    action: 'EXPERIENCE_UPDATE',
    resource: 'Experience',
    details: { experienceId: id, company: experience.company },
  });

  res.status(200).json({ success: true, data: experience });
};

/** DELETE /api/experiences/:id — suppression (admin) */
export const deleteExperience = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.experience.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Expérience introuvable.');

  await prisma.experience.delete({ where: { id } });

  await createAuditLog(req, {
    action: 'EXPERIENCE_DELETE',
    resource: 'Experience',
    details: { experienceId: id, company: existing.company },
  });

  res.status(200).json({ success: true, message: 'Expérience supprimée.' });
};
