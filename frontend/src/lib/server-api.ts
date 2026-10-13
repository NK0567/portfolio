import 'server-only';

/**
 * Lecture des données publiques depuis le serveur Next, et non depuis le
 * navigateur.
 *
 * C'est le changement le plus important de cette version. Jusqu'ici la page
 * d'accueil chargeait les projets dans un useEffect : Google, les aperçus
 * LinkedIn et WhatsApp recevaient donc une page vide, puisqu'ils ne lancent
 * pas le JavaScript. Un portfolio invisible dans les résultats de recherche
 * et sans aperçu quand on partage le lien perd l'essentiel de son intérêt.
 *
 * Les données sont désormais lues ici, à la construction de la page, et
 * remises en cache pendant une minute.
 */

const BASE =
  process.env.API_INTERNAL_URL ??
  // En ligne, NEXT_PUBLIC_API_URL vaut « /backend/api » : un chemin relatif
  // que le navigateur comprend, mais pas le serveur. On repart alors de
  // l'origine réelle de l'API.
  (process.env.BACKEND_ORIGIN ? `${process.env.BACKEND_ORIGIN.replace(/\/+$/, '')}/api` : undefined) ??
  (process.env.NEXT_PUBLIC_API_URL?.startsWith('http') ? process.env.NEXT_PUBLIC_API_URL : undefined) ??
  'http://127.0.0.1:8080/api';

/** Origine du backend, pour résoudre les fichiers servis depuis /uploads. */
export const API_ORIGIN = BASE.replace(/\/api\/?$/, '');

/**
 * Chemin d'un fichier téléversé vers son URL complète.
 * Une URL déjà absolue est renvoyée telle quelle.
 */
export const assetUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};

export interface FetchOptions {
  /** Durée du cache en secondes. 0 désactive le cache. */
  revalidate?: number;
}

/**
 * Récupère une ressource publique.
 *
 * Renvoie null plutôt que de lancer une exception. Le portfolio doit rester
 * affichable même si l'API est arrêtée : chaque section sait se taire quand
 * ses données manquent, ce qui vaut mieux qu'une page d'erreur complète
 * parce que le serveur de base de données a redémarré.
 */
export const getPublic = async <T>(
  path: string,
  options: FetchOptions = {}
): Promise<T | null> => {
  const { revalidate = 60 } = options;

  try {
    const response = await fetch(`${BASE}${path}`, {
      headers: { Accept: 'application/json' },
      ...(revalidate === 0 ? { cache: 'no-store' as const } : { next: { revalidate } }),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { success?: boolean; data?: T };
    return payload?.data ?? null;
  } catch {
    // API injoignable, DNS cassé, port fermé : on dégrade, on ne plante pas.
    return null;
  }
};
