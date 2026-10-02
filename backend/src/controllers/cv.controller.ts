import { Request, Response } from 'express';
import { buildCvData, type Lang } from '../services/cv.service';
import { generateCvPdf } from '../utils/cv-pdf';
import prisma from '../config/db';

const readLang = (req: Request): Lang => (req.query.lang === 'en' ? 'en' : 'fr');

/**
 * Enregistrement d'un téléchargement de CV.
 *
 * L'ancienne version écrivait `metricType`, `value` et `metadata`, trois
 * champs qui n'existent pas sur le modèle AnalyticsMetric. TypeScript
 * rejetait l'objet, le build échouait, et c'est pour cette raison que le
 * dossier dist restait bloqué sur une version ancienne. Le `.catch()` ne
 * masquait rien à la compilation, seulement à l'exécution.
 *
 * Les champs réels sont : event, path, country, browser, os, device.
 * Le comptage reste volontairement non bloquant : il part sans await, et son
 * échec ne doit jamais empêcher un visiteur de récupérer le PDF.
 */
const trackCvDownload = (lang: Lang): void => {
  prisma.analyticsMetric
    .create({
      data: {
        event: 'CV_DOWNLOAD',
        path: `/api/cv/download?lang=${lang}`,
      },
    })
    .catch(() => undefined);
};

/**
 * GET /api/cv : données du CV en JSON.
 * Sert à l'aperçu dans l'administration, sans générer le PDF.
 */
export const getCvData = async (req: Request, res: Response): Promise<void> => {
  const data = await buildCvData(readLang(req));
  res.status(200).json({ success: true, data });
};

/**
 * GET /api/cv/download : PDF généré à la volée.
 *
 * Le fichier n'est jamais stocké, il est reconstruit à chaque appel depuis la
 * base. Un visiteur télécharge donc toujours la version reflétant l'état
 * actuel du portfolio, sans qu'aucun fichier ne soit à re-téléverser après
 * l'ajout d'un projet ou d'une compétence.
 */
export const downloadCv = async (req: Request, res: Response): Promise<void> => {
  const lang = readLang(req);
  const cv = await buildCvData(lang);
  const pdf = await generateCvPdf(cv);

  const safeName = cv.fullName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'CV';
  const filename = `CV_${safeName}_${lang.toUpperCase()}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdf.length);
  // Jamais de cache : c'est toute la raison d'être de la génération dynamique.
  res.setHeader('Cache-Control', 'no-store');

  trackCvDownload(lang);

  res.end(pdf);
};

/**
 * GET /api/cv/preview : même PDF, affiché dans le navigateur.
 * Utilisé par l'aperçu de l'administration, dans une balise iframe.
 */
export const previewCv = async (req: Request, res: Response): Promise<void> => {
  const cv = await buildCvData(readLang(req));
  const pdf = await generateCvPdf(cv);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="cv-preview.pdf"');
  res.setHeader('Content-Length', pdf.length);
  res.setHeader('Cache-Control', 'no-store');
  res.end(pdf);
};
