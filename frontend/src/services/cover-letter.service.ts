import axios from 'axios';
import { api } from '@/lib/api';

/**
 * Lettres de motivation.
 *
 * Point important, et la raison pour laquelle ce service ne ressemble pas à
 * cvService : le CV est public, son PDF s'ouvre avec un simple <a href>. La
 * lettre, elle, est protégée. Or une balise <a> et une <iframe> ne portent
 * jamais l'en-tête Authorization, et le jeton d'accès vit en mémoire, pas
 * dans un cookie. Un lien direct renverrait donc toujours 401.
 *
 * On récupère donc le PDF en blob via axios, qui lui pose l'en-tête, puis on
 * fabrique une URL locale avec URL.createObjectURL. Même résultat à l'écran,
 * sans ouvrir de route publique ni inventer un jeton de téléchargement.
 */

export type LetterLang = 'fr' | 'en';

export interface CoverLetterSummary {
  id: string;
  title: string;
  lang: LetterLang;
  company: string | null;
  position: string | null;
  isDefault: boolean;
  isArchived: boolean;
  updatedAt: string;
}

export interface CoverLetter extends CoverLetterSummary {
  recipient: string | null;
  companyCity: string | null;
  subject: string;
  salutation: string;
  body: string[];
  closing: string;
  signature: string | null;
  createdAt: string;
}

export interface CoverLetterRender {
  id: string;
  title: string;
  lang: LetterLang;
  sender: {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
  };
  company: string;
  position: string;
  recipientBlock: string[];
  dateLine: string;
  subject: string;
  salutation: string;
  paragraphs: string[];
  closing: string;
  signature: string;
  missingVariables: string[];
  profileMissing: boolean;
  stats: {
    words: number;
    characters: number;
    paragraphs: number;
    estimatedPages: number;
  };
}

export interface CoverLetterInput {
  title: string;
  lang: LetterLang;
  company?: string;
  position?: string;
  recipient?: string;
  companyCity?: string;
  subject: string;
  salutation: string;
  body: string[];
  closing: string;
  signature?: string;
  isDefault?: boolean;
  isArchived?: boolean;
}

export interface LetterTemplate {
  title: string;
  subject: string;
  salutation: string;
  body: string[];
  closing: string;
}

/**
 * Lit le message d'erreur d'une réponse reçue en blob.
 *
 * Piège classique : avec responseType 'blob', axios applique le même
 * traitement à la réponse d'erreur. Le 400 du serveur, pourtant du JSON,
 * arrive en Blob, et getErrorMessage affiche « [object Blob] ». Il faut
 * relire le blob en texte pour retrouver le message.
 */
export const readBlobError = async (
  error: unknown,
  fallback = 'Téléchargement impossible.'
): Promise<string> => {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // Blob illisible ou pas du JSON : on retombe sur le message générique.
    }
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }

  return fallback;
};

/** Nom de fichier proposé par le serveur dans Content-Disposition. */
const filenameFromHeaders = (headers: unknown, fallback: string): string => {
  const raw = (headers as Record<string, string> | undefined)?.['content-disposition'];
  if (!raw) return fallback;

  const match = /filename="?([^";]+)"?/i.exec(raw);
  return match?.[1] ?? fallback;
};

export const coverLetterService = {
  async list(options: { archived?: boolean; search?: string } = {}) {
    const { data } = await api.get('/cover-letters', {
      params: {
        ...(options.archived ? { archived: '1' } : {}),
        ...(options.search ? { search: options.search } : {}),
      },
    });
    return data.data as CoverLetterSummary[];
  },

  async get(id: string) {
    const { data } = await api.get(`/cover-letters/${id}`);
    return data.data as CoverLetter;
  },

  async render(id: string) {
    const { data } = await api.get(`/cover-letters/${id}/render`);
    return data.data as CoverLetterRender;
  },

  async templates() {
    const { data } = await api.get('/cover-letters/templates');
    return data.data as Record<LetterLang, LetterTemplate>;
  },

  async create(payload: CoverLetterInput) {
    const { data } = await api.post('/cover-letters', payload);
    return data.data as CoverLetter;
  },

  async update(id: string, payload: Partial<CoverLetterInput>) {
    const { data } = await api.put(`/cover-letters/${id}`, payload);
    return data.data as CoverLetter;
  },

  async duplicate(id: string) {
    const { data } = await api.post(`/cover-letters/${id}/duplicate`);
    return data.data as CoverLetter;
  },

  async remove(id: string) {
    await api.delete(`/cover-letters/${id}`);
  },

  /**
   * URL locale de l'aperçu, à poser dans une <iframe>.
   * L'appelant est responsable de la libérer avec revokeObjectUrl.
   */
  async previewObjectUrl(id: string): Promise<string> {
    const response = await api.get(`/cover-letters/${id}/preview`, { responseType: 'blob' });
    return URL.createObjectURL(response.data as Blob);
  },

  /** Déclenche le téléchargement du PDF. */
  async download(id: string, force = false): Promise<void> {
    const response = await api.get(`/cover-letters/${id}/download`, {
      responseType: 'blob',
      params: force ? { force: '1' } : undefined,
    });

    const blob = response.data as Blob;
    const url = URL.createObjectURL(blob);
    const filename = filenameFromHeaders(response.headers, 'lettre-de-motivation.pdf');

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    /*
     * Libération différée : révoquer immédiatement après le clic annule le
     * téléchargement sur Safari et sur les anciens Firefox, qui n'ont pas
     * encore lu le blob au moment où la fonction rend la main.
     */
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },

  revokeObjectUrl(url: string | null): void {
    if (url) URL.revokeObjectURL(url);
  },
};
