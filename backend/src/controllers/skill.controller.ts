import { Request, Response } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { createAuditLog } from '../utils/logger';
import { CreateSkillInput, UpdateSkillInput } from '../schemas/skill.schema';

/** POST /api/skills — création (admin) */
export const createSkill = async (req: Request, res: Response): Promise<void> => {
  const data = req.body as CreateSkillInput;

  const skill = await prisma.skill.create({
    data: {
      name: data.name,
      category: data.category,
      level: data.level,
      yearsOfExp: data.yearsOfExp,
      logoUrl: data.logoUrl ?? null,
      description: data.description,
      order: data.order,
    },
  });

  await createAuditLog(req, {
    action: 'SKILL_CREATE',
    resource: 'Skill',
    details: { skillId: skill.id, name: skill.name },
  });

  res.status(201).json({ success: true, data: skill });
};

/**
 * GET /api/skills — liste publique
 * ?grouped=true renvoie les compétences déjà regroupées par catégorie,
 * ce qui évite au frontend de refaire ce tri à chaque rendu.
 */
export const getAllSkills = async (req: Request, res: Response): Promise<void> => {
  const skills = await prisma.skill.findMany({
    orderBy: [{ category: 'asc' }, { order: 'asc' }, { level: 'desc' }],
  });

  if (req.query.grouped === 'true') {
    const grouped: Record<string, typeof skills> = {};
    for (const skill of skills) {
      (grouped[skill.category] ??= []).push(skill);
    }
    res.status(200).json({ success: true, data: grouped });
    return;
  }

  res.status(200).json({ success: true, count: skills.length, data: skills });
};

/** PUT /api/skills/:id — modification (admin) */
export const updateSkill = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const data = req.body as UpdateSkillInput;

  const existing = await prisma.skill.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Compétence introuvable.');

  const skill = await prisma.skill.update({ where: { id }, data });

  await createAuditLog(req, {
    action: 'SKILL_UPDATE',
    resource: 'Skill',
    details: { skillId: id, name: skill.name },
  });

  res.status(200).json({ success: true, data: skill });
};

/** DELETE /api/skills/:id — suppression (admin) */
export const deleteSkill = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const skill = await prisma.skill.findUnique({
    where: { id },
    include: { _count: { select: { projects: true } } },
  });
  if (!skill) throw AppError.notFound('Compétence introuvable.');

  /*
   * Suppression bloquée si la compétence est encore rattachée à des projets.
   * La cascade la retirerait silencieusement de ces projets : mieux vaut un
   * refus explicite qu'une perte de données invisible.
   */
  if (skill._count.projects > 0) {
    throw AppError.conflict(
      `Cette compétence est utilisée par ${skill._count.projects} projet(s). Retire-la d'abord de ces projets.`
    );
  }

  await prisma.skill.delete({ where: { id } });

  await createAuditLog(req, {
    action: 'SKILL_DELETE',
    resource: 'Skill',
    details: { skillId: id, name: skill.name },
  });

  res.status(200).json({ success: true, message: 'Compétence supprimée.' });
};
