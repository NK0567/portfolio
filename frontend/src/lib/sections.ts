/**
 * Sections déplaçables de la page d'accueil.
 *
 * Partagé par l'écran Site de l'administration (qui enregistre l'ordre) et
 * par la page d'accueil (qui l'applique). Un seul endroit décrit les clés :
 * impossible que l'un connaisse une section que l'autre ignore.
 *
 * L'en-tête (hero) reste toujours en premier : ce n'est pas une section
 * qu'on déplace, c'est l'entrée du site.
 */

export const HOME_SECTIONS = [
  'stack',
  'projects',
  'code',
  'skills',
  'devops',
  'security',
  'experience',
  'contact',
] as const;

export type HomeSection = (typeof HOME_SECTIONS)[number];

export const HOME_SECTION_LABELS: Record<HomeSection, string> = {
  stack: 'Orbite des technologies',
  projects: 'Projets',
  code: 'Code et terminal',
  skills: 'Réseau de compétences',
  devops: 'Pipeline DevOps',
  security: 'Sécurité et labs',
  experience: 'Parcours',
  contact: 'Contact',
};

const isHomeSection = (key: string): key is HomeSection =>
  (HOME_SECTIONS as readonly string[]).includes(key);

/**
 * Ordre effectif à partir de ce qui est enregistré.
 *
 * Les clés inconnues (anciennes versions : « hero », « about ») sont
 * ignorées. Une section absente de l'ordre enregistré, typiquement ajoutée
 * après coup, est insérée juste après celle qui la précède dans l'ordre par
 * défaut, et non reléguée en fin de page.
 */
export const resolveSectionOrder = (saved: unknown): HomeSection[] => {
  const order: HomeSection[] = [];
  // Un ordre enregistré par l'ancienne version du site (« hero », « about »...)
  // ne décrit pas les sections actuelles : on repart de l'ordre par défaut.
  const legacy = Array.isArray(saved) && saved.some((k) => k === 'hero' || k === 'about' || k === 'education');
  if (Array.isArray(saved) && !legacy) {
    for (const key of saved) {
      if (typeof key === 'string' && isHomeSection(key) && !order.includes(key)) order.push(key);
    }
  }

  HOME_SECTIONS.forEach((key, index) => {
    if (order.includes(key)) return;
    const previous = HOME_SECTIONS.slice(0, index).reverse().find((k) => order.includes(k));
    const at = previous ? order.indexOf(previous) + 1 : 0;
    order.splice(at, 0, key);
  });

  return order;
};
