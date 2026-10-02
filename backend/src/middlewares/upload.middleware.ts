import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../utils/AppError';

export const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');

// Créé une seule fois au chargement du module, pas à chaque requête.
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const DOC_MIME = ['application/pdf'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    /*
     * Le nom d'origine n'est JAMAIS réutilisé : il peut contenir des
     * séquences de traversée de répertoire ("../../etc/passwd") ou une
     * double extension ("photo.php.jpg"). On génère un nom aléatoire et on
     * ne conserve que l'extension, elle-même filtrée par le fileFilter.
     */
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

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
 * Supprime un fichier physique du dossier d'uploads.
 *
 * Sécurisé contre la traversée de répertoire : on vérifie que le chemin
 * résolu reste bien à l'intérieur de UPLOAD_DIR avant toute suppression.
 */
export const deleteUploadedFile = (publicPath?: string | null): void => {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;

  const filename = path.basename(publicPath);
  const target = path.resolve(UPLOAD_DIR, filename);

  if (!target.startsWith(path.resolve(UPLOAD_DIR))) return;

  fs.promises.unlink(target).catch(() => {
    /* fichier déjà absent : sans conséquence */
  });
};
