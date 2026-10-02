import { Request, Response } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { createAuditLog } from '../utils/logger';
import { deleteUploadedFile } from '../middlewares/upload.middleware';
import { UpsertProfileInput } from '../schemas/profile.schema';

/**
 * Profile est un SINGLETON : une seule ligne en base.
 * On la retrouve donc par findFirst(), jamais par un identifiant connu d'avance.
 */
const getSingleton = () => prisma.profile.findFirst();

/** GET /api/profile — public (alimente le hero et la page « À propos ») */
export const getProfile = async (_req: Request, res: Response): Promise<void> => {
  const profile = await getSingleton();

  if (!profile) {
    throw AppError.notFound(
      "Le profil n'est pas encore configuré. Renseigne-le depuis l'administration.",
      'PROFILE_NOT_CONFIGURED'
    );
  }

  res.status(200).json({ success: true, data: profile });
};

/**
 * PUT /api/profile — création ou mise à jour (admin)
 *
 * Un seul point d'entrée pour les deux cas : le frontend n'a pas à savoir
 * si la ligne existe déjà, ce qui simplifie le formulaire d'administration.
 */
export const upsertProfile = async (req: Request, res: Response): Promise<void> => {
  const data = req.body as Partial<UpsertProfileInput>;
  const existing = await getSingleton();

  let profile;

  if (existing) {
    profile = await prisma.profile.update({ where: { id: existing.id }, data });

    // Les anciens fichiers remplacés sont supprimés du disque.
    if (data.avatarUrl && data.avatarUrl !== existing.avatarUrl) {
      deleteUploadedFile(existing.avatarUrl);
    }
    if (data.cvUrlFr && data.cvUrlFr !== existing.cvUrlFr) {
      deleteUploadedFile(existing.cvUrlFr);
    }
    if (data.cvUrlEn && data.cvUrlEn !== existing.cvUrlEn) {
      deleteUploadedFile(existing.cvUrlEn);
    }
  } else {
    if (!data.firstName || !data.lastName) {
      throw AppError.badRequest(
        'Le prénom et le nom sont obligatoires lors de la première configuration.'
      );
    }
    profile = await prisma.profile.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        avatarUrl: data.avatarUrl ?? null,
        cvUrlFr: data.cvUrlFr ?? null,
        cvUrlEn: data.cvUrlEn ?? null,
        bio: data.bio ?? { fr: '', en: '' },
        titles: data.titles ?? { fr: [], en: [] },
      },
    });
  }

  await createAuditLog(req, {
    action: existing ? 'PROFILE_UPDATE' : 'PROFILE_CREATE',
    resource: 'Profile',
    details: { profileId: profile.id },
  });

  res.status(existing ? 200 : 201).json({ success: true, data: profile });
};

/**
 * POST /api/profile/cv?lang=fr — remplacement du CV PDF (admin)
 * Le fichier est déjà validé et stocké par le middleware d'upload.
 */
export const uploadCv = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) throw AppError.badRequest('Aucun fichier reçu.');

  const lang = req.query.lang === 'en' ? 'en' : 'fr';
  const field = lang === 'en' ? 'cvUrlEn' : 'cvUrlFr';
  const url = `/uploads/${req.file.filename}`;

  const existing = await getSingleton();
  if (!existing) {
    throw AppError.badRequest("Configure d'abord ton profil avant d'envoyer un CV.");
  }

  const profile = await prisma.profile.update({
    where: { id: existing.id },
    data: { [field]: url },
  });

  deleteUploadedFile(existing[field]);

  await createAuditLog(req, {
    action: 'CV_UPLOAD',
    resource: 'Profile',
    details: { lang, url },
  });

  res.status(200).json({ success: true, data: profile });
};
