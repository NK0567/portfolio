import { Request, Response } from 'express';
import prisma from '../config/db';

/**
 * GET /api/admin/stats — chiffres du tableau de bord.
 *
 * Toutes les requêtes partent en parallèle via $transaction plutôt qu'en
 * série : le temps de réponse est celui de la plus lente, pas leur somme.
 */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalProjects,
    totalSkills,
    totalExperiences,
    totalCertifications,
    publishedPosts,
    unreadMessages,
    recentActivities,
    activeSessions,
  ] = await prisma.$transaction([
    prisma.project.count(),
    prisma.skill.count(),
    prisma.experience.count(),
    prisma.certification.count(),
    prisma.blogPost.count({ where: { isPublished: true } }),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
  ]);

  // Pas d'annotation sur le résultat de groupBy : elle casse l'inférence
  // des génériques de Prisma, qui exige alors un orderBy.
  const projectsByStatus = await prisma.project.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  res.status(200).json({
    success: true,
    data: {
      totalProjects,
      totalSkills,
      totalExperiences,
      totalCertifications,
      publishedPosts,
      unreadMessages,
      recentActivities,
      activeSessions,
      projectsByStatus: projectsByStatus.map((row) => ({
        status: row.status,
        count: row._count.status,
      })),
    },
  });
};

/** GET /api/admin/logs — activité récente affichée sur le dashboard. */
export const getLogs = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { username: true, email: true } } },
  });

  res.status(200).json({ success: true, data: logs });
};
