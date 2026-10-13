import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../utils/AppError';
import { databaseStorage, deleteStoredFile } from '../utils/file-store';

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const DOC_MIME = ['application/pdf'];

/*
 * Les fichiers vont en base (voir utils/file-store.ts) : un hébergement
 * gratuit efface le disque à chaque redémarrage. Le nom généré est
 * aléatoire, celui d'origine n'est jamais réutilisé.
 */
const storage = databaseStorage();

const makeFilter =
  (allowed: string[], label: string) =>
  (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(AppError.badRequest(`Format non supporté. Types acceptés : ${label}.`));
  };

/** Upload d'images (5 Mo max). */
export const uploadImage = multer({
  storage,
  fileFilter: makeFilter(IMAGE_MIME, 'JPEG, PNG, WebP, AVIF, GIF'),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

/**
 * Upload de la photo de profil.
 *
 * Volontairement plus restrictif que uploadImage : cette photo est imprimée
 * dans le PDF du CV, et PDFKit ne sait décoder que le JPEG et le PNG. Refuser
 * un WebP à l'envoi donne un message clair, là où l'accepter produirait un CV
 * silencieusement dépourvu de photo.
 */
export const uploadAvatar = multer({
  storage,
  fileFilter: makeFilter(['image/jpeg', 'image/png'], 'JPEG, PNG'),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

/** Upload de documents PDF (10 Mo max) — utilisé pour le CV. */
export const uploadDocument = multer({
  storage,
  fileFilter: makeFilter(DOC_MIME, 'PDF'),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

/** Compatibilité avec l'ancien nom importé dans les routes existantes. */
export const upload = uploadImage;

/**
 * Recopie le chemin public du fichier uploadé dans req.body.
 *
 * Indispensable pour que la validation Zod voie le champ : Multer place le
 * fichier dans req.file, pas dans req.body. Ce middleware se glisse entre
 * l'upload et la validation.
 *
 *   uploadImage.single('coverImage'), mapFileToBody('mainImage'), validateBody(schema)
 */
export const mapFileToBody =
  (field: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (req.file) {
      req.body = req.body ?? {};
      req.body[field] = `/uploads/${req.file.filename}`;
    }
    next();
  };

/** Même chose pour un upload multiple (galerie d'un projet). */
export const mapFilesToBody =
  (field: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (files?.length) {
      req.body = req.body ?? {};
      req.body[field] = files.map((f) => `/uploads/${f.filename}`);
    }
    next();
  };

/**
 * Supprime un fichier envoyé (en base, et sur l'ancien disque s'il y est).
 * Le nom est contrôlé avant toute opération : aucune traversée possible.
 */
export const deleteUploadedFile = (publicPath?: string | null): void => deleteStoredFile(publicPath);
