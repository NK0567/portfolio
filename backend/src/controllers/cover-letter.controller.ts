import { Request, Response } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { createAuditLog } from '../utils/logger';
import { getValidatedQuery } from '../middlewares/validate.middleware';
import {
  buildCoverLetterRender,
  LETTER_TEMPLATES,
  type CoverLetterRender,
} from '../services/cover-letter.service';
import { generateCoverLetterPdf } from '../utils/cover-letter-pdf';
import type {
  CreateCoverLetterInput,
  UpdateCoverLetterInput,
  RenderQuery,
  ListQuery,
} from '../schemas/cover-letter.schema';

/**
 * Toutes les routes de ce contrôleur sont privées.
 *
 * Il n'existe volontairement aucune version publique : une lettre de
 * motivation nomme une entreprise, un poste et parfois un salaire espéré.
 * Rien de tout cela n'a sa place sur un portfolio public, et un identifiant
 * UUID deviné ne doit pas suffire à la lire.
 */

/** Nom de fichier sûr : pas d'accent, pas d'espace, pas de guillemet. */
const safeFilename = (letter: CoverLetterRender): string => {
  const base = [letter.sender.fullName || 'Lettre', letter.company].filter(Boolean).join('_');

  const cleaned = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return `Lettre_motivation_${cleaned || 'document'}_${letter.lang.toUpperCase()}.pdf`;
};

/* ---------------- Lecture ---------------- */

/** GET /api/cover-letters */
export const listCoverLetters = async (_req: Request, res: Response): Promise<void> => {
  const { archived, search } = getValidatedQuery<ListQuery>(res);

  const letters = await prisma.coverLetter.findMany({
    where: {
      isArchived: archived ?? false,
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { company: { contains: search } },
              { position: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      title: true,
      lang: true,
      company: true,
      position: true,
      isDefault: true,
      isArchived: true,
      updatedAt: true,
    },
  });

  res.status(200).json({ success: true, count: letters.length, data: letters });
};

/** GET /api/cover-letters/templates — textes de départ, rien n'est écrit en base. */
export const getTemplates = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: LETTER_TEMPLATES });
};

/** GET /api/cover-letters/:id */
export const getCoverLetter = async (req: Request, res: Response): Promise<void> => {
  const letter = await prisma.coverLetter.findUnique({ where: { id: req.params.id as string } });
  if (!letter) throw AppError.notFound('Lettre introuvable.');

  res.status(200).json({ success: true, data: letter });
};

/**
 * GET /api/cover-letters/:id/render
 *
 * Le texte final, variables remplacées, sans passer par le PDF. C'est ce que
 * consomme l'aperçu de l'interface, et c'est aussi ce qu'on copie pour coller
 * dans le corps d'un e-mail ou dans un formulaire de candidature en ligne.
 */
export const renderCoverLetter = async (req: Request, res: Response): Promise<void> => {
  const data = await buildCoverLetterRender(req.params.id as string);
  res.status(200).json({ success: true, data });
};

/* ---------------- Écriture ---------------- */

/*
 * Une seule lettre peut porter isDefault. Le retrait du drapeau sur les
 * autres et sa pose sur celle-ci se font dans une transaction : sans cela,
 * une coupure entre les deux requêtes laisse soit deux lettres par défaut,
 * soit aucune.
 */

/** POST /api/cover-letters */
export const createCoverLetter = async (req: Request, res: Response): Promise<void> => {
  const data = req.body as CreateCoverLetterInput;

  const letter = await prisma.$transaction(async (tx) => {
    const created = await tx.coverLetter.create({
      data: {
        title: data.title,
        lang: data.lang,
        company: data.company ?? null,
        position: data.position ?? null,
        recipient: data.recipient ?? null,
        companyCity: data.companyCity ?? null,
        subject: data.subject,
        salutation: data.salutation,
        body: data.body,
        closing: data.closing,
        signature: data.signature ?? null,
        isDefault: data.isDefault,
        isArchived: data.isArchived,
      },
    });

    if (created.isDefault) {
      await tx.coverLetter.updateMany({
        where: { id: { not: created.id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    return created;
  });

  await createAuditLog(req, {
    action: 'COVER_LETTER_CREATE',
    resource: 'CoverLetter',
    details: { coverLetterId: letter.id, title: letter.title },
  });

  res.status(201).json({ success: true, data: letter });
};

/** PUT /api/cover-letters/:id */
export const updateCoverLetter = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const data = req.body as UpdateCoverLetterInput;

  const existing = await prisma.coverLetter.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Lettre introuvable.');

  const letter = await prisma.$transaction(async (tx) => {
    const updated = await tx.coverLetter.update({ where: { id }, data });

    if (data.isDefault === true) {
      await tx.coverLetter.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    return updated;
  });

  await createAuditLog(req, {
    action: 'COVER_LETTER_UPDATE',
    resource: 'CoverLetter',
    details: { coverLetterId: id, fields: Object.keys(data) },
  });

  res.status(200).json({ success: true, data: letter });
};

/**
 * POST /api/cover-letters/:id/duplicate
 *
 * Le geste quotidien d'une recherche d'emploi : repartir de la lettre qui a
 * bien fonctionné, changer l'entreprise et le poste, envoyer. La copie n'est
 * jamais la lettre par défaut, et les champs liés à l'entreprise sont vidés
 * pour qu'on ne puisse pas envoyer la copie avec le nom du précédent
 * destinataire resté en place.
 */
export const duplicateCoverLetter = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const source = await prisma.coverLetter.findUnique({ where: { id } });
  if (!source) throw AppError.notFound('Lettre introuvable.');

  const copy = await prisma.coverLetter.create({
    data: {
      title: `${source.title} (copie)`.slice(0, 120),
      lang: source.lang,
      company: null,
      position: null,
      recipient: null,
      companyCity: null,
      subject: source.subject,
      salutation: source.salutation,
      body: source.body as object,
      closing: source.closing,
      signature: source.signature,
      isDefault: false,
      isArchived: false,
    },
  });

  await createAuditLog(req, {
    action: 'COVER_LETTER_DUPLICATE',
    resource: 'CoverLetter',
    details: { sourceId: id, copyId: copy.id },
  });

  res.status(201).json({ success: true, data: copy });
};

/** DELETE /api/cover-letters/:id */
export const deleteCoverLetter = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.coverLetter.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Lettre introuvable.');

  await prisma.coverLetter.delete({ where: { id } });

  await createAuditLog(req, {
    action: 'COVER_LETTER_DELETE',
    resource: 'CoverLetter',
    details: { coverLetterId: id, title: existing.title },
  });

  res.status(200).json({ success: true, message: 'Lettre supprimée.' });
};

/* ---------------- PDF ---------------- */

/**
 * Garde-fou avant impression.
 *
 * Trois situations bloquantes, chacune avec son message, parce qu'un 400
 * « requête invalide » n'aide personne à 23 h la veille d'une candidature :
 *   - plus un seul paragraphe exploitable en base ;
 *   - le profil n'est pas renseigné, donc la lettre sortirait sans nom ni
 *     coordonnées, ce qui la rend inutilisable ;
 *   - des variables non résolues, qui imprimeraient [entreprise] en clair.
 *
 * Le dernier cas est franchissable avec ?force=1 : on peut vouloir imprimer
 * un brouillon pour le relire sur papier. Les deux premiers ne le sont pas,
 * il n'y a rien à relire dans une lettre vide ou anonyme.
 */
const assertPrintable = (letter: CoverLetterRender, force: boolean): void => {
  if (letter.paragraphs.length === 0) {
    throw AppError.badRequest('Cette lettre ne contient aucun paragraphe à imprimer.');
  }

  if (letter.profileMissing || !letter.sender.fullName) {
    throw AppError.badRequest(
      'Ton profil n\'est pas renseigné : la lettre sortirait sans nom ni coordonnées. ' +
        'Complète-le dans Paramètres avant de télécharger.'
    );
  }

  if (!force && letter.missingVariables.length > 0) {
    throw AppError.badRequest(
      `Variables non remplacées : ${letter.missingVariables.join(', ')}. ` +
        'Renseigne l\'entreprise et le poste, ou relance avec « télécharger quand même ».'
    );
  }
};

/** GET /api/cover-letters/:id/preview — PDF affiché dans le navigateur. */
export const previewCoverLetterPdf = async (req: Request, res: Response): Promise<void> => {
  const letter = await buildCoverLetterRender(req.params.id as string);

  // L'aperçu tolère les variables manquantes : son rôle est justement de les
  // montrer à leur place dans la page, entre crochets.
  assertPrintable(letter, true);

  const pdf = await generateCoverLetterPdf(letter);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="lettre-apercu.pdf"');
  res.setHeader('Content-Length', pdf.length);
  res.setHeader('Cache-Control', 'no-store');
  res.end(pdf);
};

/** GET /api/cover-letters/:id/download — PDF en pièce jointe. */
export const downloadCoverLetterPdf = async (req: Request, res: Response): Promise<void> => {
  const { force } = getValidatedQuery<RenderQuery>(res);
  const letter = await buildCoverLetterRender(req.params.id as string);

  assertPrintable(letter, force);

  const pdf = await generateCoverLetterPdf(letter);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(letter)}"`);
  res.setHeader('Content-Length', pdf.length);
  res.setHeader('Cache-Control', 'no-store');

  await createAuditLog(req, {
    action: 'COVER_LETTER_DOWNLOAD',
    resource: 'CoverLetter',
    details: { coverLetterId: letter.id, forced: force },
  });

  res.end(pdf);
};
