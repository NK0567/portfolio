import prisma from '../config/db';

/**
 * Transforme un titre en slug URL-safe.
 * "Plateforme de Paiement — v2" -> "plateforme-de-paiement-v2"
 *
 * La normalisation NFD + suppression des diacritiques garantit que
 * "Sécurité Réseau" devienne "securite-reseau" et non "scurit-rseau".
 */
export const slugify = (text: string): string =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // ne garde que lettres, chiffres, espaces, tirets
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Produit un slug unique pour un projet.
 *
 * Le suffixe numérique n'est ajouté qu'en cas de collision réelle,
 * contrairement à l'ancienne version qui collait systématiquement un
 * timestamp. Un slug doit rester stable dans le temps : c'est lui qui
 * constitue l'URL publique indexée par Google et partagée par les visiteurs.
 *
 * @param excludeId  id du projet en cours de modification, à ignorer
 *                   dans la détection de collision (sinon il se bloque lui-même)
 */
export const generateUniqueProjectSlug = async (
  title: string,
  excludeId?: string
): Promise<string> => {
  const base = slugify(title) || 'projet';
  let candidate = base;
  let suffix = 1;

  // La boucle s'arrête dès qu'aucun autre projet ne porte ce slug.
  for (;;) {
    const existing = await prisma.project.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
};

/** Même principe pour les labs : slug fixé à la création, suffixe en cas de collision. */
export const generateUniqueLabSlug = async (title: string): Promise<string> => {
  const base = slugify(title) || 'lab';
  let candidate = base;
  let suffix = 1;

  while (await prisma.cyberLab.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
};
