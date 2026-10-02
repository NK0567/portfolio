import { api } from '@/lib/api';

export interface UploadedFile {
  path: string;
  size: number;
  mimetype: string;
}

/** Plafond côté serveur, répété ici pour refuser avant l'envoi. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
];

export const uploadService = {
  /**
   * Dépose une image et renvoie son chemin public.
   *
   * La taille et le type sont vérifiés ici avant l'envoi. Ce n'est pas une
   * sécurité, le serveur refait le contrôle de toute façon, c'est une
   * question de temps : laisser monter 12 Mo sur une connexion lente pour
   * recevoir un refus à l'arrivée est une mauvaise manière de traiter
   * quelqu'un.
   */
  async image(file: File): Promise<UploadedFile> {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Format refusé. Utilise un JPEG, PNG, WebP, AVIF ou GIF.');
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      throw new Error(`Fichier trop lourd (${mb} Mo). La limite est de 5 Mo.`);
    }

    const fd = new FormData();
    fd.append('file', file);

    const { data } = await api.post('/uploads/image', fd);
    return data.data as UploadedFile;
  },

  /**
   * Supprime un fichier déposé.
   *
   * Appelé quand on retire une capture avant d'enregistrer le projet. L'échec
   * est volontairement ignoré par l'appelant : au pire un fichier orphelin
   * reste sur le disque, ce qui ne justifie pas de bloquer le formulaire.
   */
  async remove(path: string): Promise<void> {
    await api.delete('/uploads', { data: { path } });
  },
};
