import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import type { StorageEngine } from 'multer';
import prisma from '../config/db';

/**
 * Stockage des fichiers envoyés, en base de données.
 *
 * Pourquoi pas le disque : les hébergeurs gratuits effacent le système de
 * fichiers à chaque redémarrage ou redéploiement. Une image déposée le lundi
 * aurait disparu le mardi. En base, elle est sauvegardée avec le reste.
 *
 * Le reste de l'application ne voit aucune différence : les fichiers gardent
 * une adresse /uploads/<nom>, et Multer remplit toujours req.file.filename.
 * Les anciens fichiers restés sur le disque sont encore servis, en repli.
 */

/** Dossier historique des fichiers, conservé pour la lecture en repli. */
export const LEGACY_UPLOAD_DIR = path.join(__dirname, '../../public/uploads');

/**
 * Nom aléatoire, jamais celui d'origine : il peut contenir une traversée de
 * répertoire (« ../../etc/passwd ») ou une double extension (« photo.php.jpg »).
 * Seule l'extension est gardée, et le type a déjà été filtré par Multer.
 */
const randomName = (originalName: string): string => {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
};

/** Seul format de nom accepté en lecture : rien qui puisse sortir du dossier. */
const SAFE_NAME = /^[\w.-]{1,80}$/;

/** Moteur de stockage Multer qui écrit dans la table StoredFile. */
export const databaseStorage = (): StorageEngine => ({
  _handleFile(_req, file, cb) {
    const chunks: Buffer[] = [];
    let size = 0;

    file.stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
    });
    file.stream.on('error', (error) => cb(error));
    file.stream.on('end', () => {
      const filename = randomName(file.originalname);
      prisma.storedFile
        .create({
          data: { filename, mimeType: file.mimetype, size, data: Buffer.concat(chunks) },
        })
        .then(() => cb(null, { filename, size, path: `/uploads/${filename}` }))
        .catch((error: unknown) => cb(error as Error));
    });
  },

  _removeFile(_req, file, cb) {
    // Appelé par Multer si la requête échoue après l'écriture.
    prisma.storedFile
      .delete({ where: { filename: file.filename } })
      .then(() => cb(null))
      .catch(() => cb(null));
  },
});

const filenameOf = (publicPath: string): string | null => {
  if (!publicPath.startsWith('/uploads/')) return null;
  const name = path.basename(publicPath);
  return SAFE_NAME.test(name) ? name : null;
};

/** Lit un fichier /uploads/... : d'abord en base, puis sur l'ancien disque. */
export const readStoredFile = async (
  publicPath: string
): Promise<{ data: Buffer; mimeType: string } | null> => {
  const name = filenameOf(publicPath);
  if (!name) return null;

  const stored = await prisma.storedFile.findUnique({ where: { filename: name } });
  if (stored) return { data: Buffer.from(stored.data), mimeType: stored.mimeType };

  try {
    const data = await fs.promises.readFile(path.join(LEGACY_UPLOAD_DIR, name));
    return { data, mimeType: 'application/octet-stream' };
  } catch {
    return null;
  }
};

/** Supprime un fichier, en base comme sur l'ancien disque. Ne lève jamais. */
export const deleteStoredFile = (publicPath?: string | null): void => {
  if (!publicPath) return;
  const name = filenameOf(publicPath);
  if (!name) return;

  prisma.storedFile.delete({ where: { filename: name } }).catch(() => {
    /* absent de la base : peut-être un ancien fichier disque */
  });
  fs.promises.unlink(path.join(LEGACY_UPLOAD_DIR, name)).catch(() => {
    /* absent du disque : sans conséquence */
  });
};

/**
 * GET /uploads/:filename : sert un fichier stocké en base.
 *
 * Les noms étant aléatoires et jamais réutilisés, le contenu d'une adresse
 * ne change jamais : le navigateur et le CDN peuvent le garder un an.
 * Un fichier absent de la base passe la main à express.static, qui sert
 * les anciens fichiers du disque.
 */
export const serveStoredFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const name = req.params.filename as string;
  if (!SAFE_NAME.test(name)) {
    next();
    return;
  }

  try {
    const stored = await prisma.storedFile.findUnique({ where: { filename: name } });
    if (!stored) {
      next();
      return;
    }

    res.setHeader('Content-Type', stored.mimeType);
    res.setHeader('Content-Length', String(stored.size));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // Un PDF ou une image ne doit jamais être interprété comme une page.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.end(Buffer.from(stored.data));
  } catch (error) {
    next(error);
  }
};
