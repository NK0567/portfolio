import { Request, Response } from 'express';
import prisma from '../config/db';
import { createAuditLog } from '../utils/logger';
import { DEFAULT_CONFIG, UpsertConfigInput } from '../schemas/config.schema';

/**
 * GlobalConfig est un singleton dont l'identifiant est fixé par le schéma
 * Prisma (@default("current_config")). On peut donc utiliser directement
 * upsert(), sans passer par un findFirst() préalable.
 */
const CONFIG_ID = 'current_config';

/**
 * GET /api/config — public
 *
 * Appelée par le layout du frontend : couleurs, SEO par défaut, liens
 * sociaux, ordre des sections. Renvoie les valeurs par défaut plutôt qu'un
 * 404 si rien n'a encore été configuré, pour que le site public reste
 * affichable dès le premier déploiement.
 */
export const getConfig = async (_req: Request, res: Response): Promise<void> => {
  const config = await prisma.globalConfig.findUnique({ where: { id: CONFIG_ID } });

  res.status(200).json({
    success: true,
    data: config ?? { id: CONFIG_ID, ...DEFAULT_CONFIG },
  });
};

/** PUT /api/config — création ou mise à jour (admin) */
export const upsertConfig = async (req: Request, res: Response): Promise<void> => {
  const data = req.body as Partial<UpsertConfigInput>;

  const config = await prisma.globalConfig.upsert({
    where: { id: CONFIG_ID },
    update: data,
    create: { id: CONFIG_ID, ...DEFAULT_CONFIG, ...data },
  });

  await createAuditLog(req, {
    action: 'CONFIG_UPDATE',
    resource: 'GlobalConfig',
    details: { fields: Object.keys(data) },
  });

  res.status(200).json({ success: true, data: config });
};
