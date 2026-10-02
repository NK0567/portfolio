import { Request, Response } from 'express';
import prisma from '../config/db';
import { getValidatedQuery } from '../middlewares/validate.middleware';
import { Pagination } from '../schemas/common.schema';

/**
 * GET /api/audit — journal complet, paginé (SUPERADMIN uniquement).
 *
 * Le comptage et la page sont récupérés en une seule transaction pour que
 * `total` corresponde exactement au jeu de données renvoyé.
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = getValidatedQuery<Pagination>(res);
  const skip = (page - 1) * limit;

  const action = req.query.action as string | undefined;
  const where = action ? { action } : {};

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    data: logs,
  });
};
