/**
 * Résolution des chemins de fichiers déposés.
 *
 * Le backend stocke « /uploads/1759... .jpg », un chemin relatif. Dans une
 * balise img du frontend, ce chemin est résolu contre l'origine de Next, donc
 * localhost:3000, où rien ne répond : l'image des projets ne s'affichait pas
 * dans l'administration et personne ne comprenait pourquoi.
 *
 * Toute image venant de l'API doit passer par ici.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api';

/** Origine du backend, sans le suffixe /api. */
export const MEDIA_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export const mediaUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${MEDIA_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};
