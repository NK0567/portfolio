import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR } from '../middlewares/upload.middleware';

/**
 * Chargement de la photo de profil pour le PDF.
 *
 * PDFKit ne sait décoder que le JPEG et le PNG : il travaille sur les octets
 * bruts, sans moteur de rendu. Un WebP ou un AVIF — pourtant acceptés à
 * l'upload pour le site — feraient échouer la génération. On vérifie donc le
 * format par ses octets d'en-tête (« magic bytes ») plutôt que par
 * l'extension du fichier, qui peut mentir.
 */

const isJpeg = (buf: Buffer): boolean => buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8;

const isPng = (buf: Buffer): boolean =>
  buf.length > 8 &&
  buf[0] === 0x89 &&
  buf[1] === 0x50 &&
  buf[2] === 0x4e &&
  buf[3] === 0x47;

/**
 * Résout une URL d'avatar en Buffer exploitable par PDFKit.
 * Renvoie null en cas d'échec : un CV sans photo vaut mieux qu'un CV en erreur.
 */
export const loadAvatar = async (avatarUrl: string | null): Promise<Buffer | null> => {
  if (!avatarUrl) return null;

  try {
    let buffer: Buffer;

    if (avatarUrl.startsWith('/uploads/')) {
      // Fichier local : on résout puis on vérifie qu'on reste bien dans le
      // dossier d'uploads (protection contre la traversée de répertoire).
      const filename = path.basename(avatarUrl);
      const target = path.resolve(UPLOAD_DIR, filename);
      if (!target.startsWith(path.resolve(UPLOAD_DIR))) return null;

      buffer = await fs.promises.readFile(target);
    } else if (/^https?:\/\//.test(avatarUrl)) {
      // Image distante : délai court, car la génération du CV ne doit jamais
      // rester bloquée sur un serveur d'images lent ou injoignable.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch(avatarUrl, { signal: controller.signal });
        if (!response.ok) return null;
        buffer = Buffer.from(await response.arrayBuffer());
      } finally {
        clearTimeout(timeout);
      }
    } else {
      return null;
    }

    if (!isJpeg(buffer) && !isPng(buffer)) {
      console.warn(
        '[cv] Photo ignorée : seuls le JPEG et le PNG sont exploitables dans un PDF. ' +
          'Réenvoie ta photo dans un de ces deux formats.'
      );
      return null;
    }

    return buffer;
  } catch (error) {
    console.warn('[cv] Photo illisible, le CV sera généré sans :', error instanceof Error ? error.message : error);
    return null;
  }
};

/** "KALEFACK NGOUADJEU Boris" -> "KB" — utilisé quand aucune photo n'est disponible. */
export const getInitials = (fullName: string): string => {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? words[words.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
};
