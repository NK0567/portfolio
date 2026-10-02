import { Request, Response } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { createAuditLog } from '../utils/logger';
import { CreateEducationInput, UpdateEducationInput } from '../schemas/education.schema';

/** GET /api/education — liste publique, la plus récente en premier. */
export const getAllEducation = async (_req: Request, res: Response): Promise<void> => {
  const education = await prisma.education.findMany({
    orderBy: [{ order: 'asc' }, { startDate: 'desc' }],
  });
  res.status(200).json({ success: true, count: education.length, data: education });
};

/** POST /api/education — création (admin). */
export const createEducation = async (req: Request, res: Response): Promise<void> => {
  const data = req.body as CreateEducationInput;

  const education = await prisma.education.create({
    data: {
      degree: data.degree,
      school: data.school,
      location: data.location ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      isCurrent: data.isCurrent,
      description: data.description,
      order: data.order,
    },
  });

  await createAuditLog(req, {
    action: 'EDUCATION_CREATE',
    resource: 'Education',
    details: { educationId: education.id, school: education.school },
  });

  res.status(201).json({ success: true, data: education });
};

/** PUT /api/education/:id — modification (admin). */
export const updateEducation = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const data = req.body as UpdateEducationInput;

  const existing = await prisma.education.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Formation introuvable.');

  const startDate = data.startDate ?? existing.startDate;
  const endDate = data.endDate === undefined ? existing.endDate : data.endDate;

  if (endDate && endDate < startDate) {
    throw AppError.badRequest('La date de fin doit être postérieure à la date de début.');
  }

  const education = await prisma.education.update({
    where: { id },
    data: { ...data, startDate, endDate },
  });

  await createAuditLog(req, {
    action: 'EDUCATION_UPDATE',
    resource: 'Education',
    details: { educationId: id },
  });

  res.status(200).json({ success: true, data: education });
};

/** DELETE /api/education/:id — suppression (admin). */
export const deleteEducation = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.education.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Formation introuvable.');

  await prisma.education.delete({ where: { id } });

  await createAuditLog(req, {
    action: 'EDUCATION_DELETE',
    resource: 'Education',
    details: { educationId: id, school: existing.school },
  });

  res.status(200).json({ success: true, message: 'Formation supprimée.' });
};
