import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api';

/**
 * Le CV est régénéré par le serveur à chaque appel, à partir des mêmes
 * données que le portfolio. Aucun fichier n'est stocké : il n'y a donc rien
 * à re-téléverser après l'ajout d'un projet ou d'une compétence.
 */
export const cvService = {
  /** URL directe de téléchargement (route publique, aucun en-tête à poser). */
  downloadUrl: (lang: 'fr' | 'en' = 'fr') => `${API_URL}/cv/download?lang=${lang}`,

  /** URL d'aperçu, à placer dans une balise <iframe>. */
  previewUrl: (lang: 'fr' | 'en' = 'fr') => `${API_URL}/cv/preview?lang=${lang}`,

  /** Données brutes, pour le récapitulatif affiché dans l'administration. */
  async getData(lang: 'fr' | 'en' = 'fr') {
    const { data } = await api.get(`/cv?lang=${lang}`);
    return data.data;
  },
};
