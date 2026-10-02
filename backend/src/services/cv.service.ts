import prisma from '../config/db';

/**
 * Assemblage des données du CV.
 *
 * C'est le cœur de la fonctionnalité « CV toujours à jour » : rien n'est
 * stocké en dur. À chaque téléchargement, le CV est reconstruit à partir des
 * mêmes tables que le portfolio public. Ajouter un projet, une compétence ou
 * une expérience depuis l'administration met donc le CV à jour
 * automatiquement, sans aucune manipulation supplémentaire.
 */

export type Lang = 'fr' | 'en';

/** Lit un champ bilingue stocké en JSON, avec repli sur le français. */
const pick = (value: unknown, lang: Lang): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const obj = value as Record<string, unknown>;
  return String(obj[lang] ?? obj.fr ?? obj.en ?? '');
};

const pickList = (value: unknown, lang: Lang): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  const obj = value as Record<string, unknown>;
  const list = obj[lang] ?? obj.fr ?? obj.en;
  return Array.isArray(list) ? list.map(String) : [];
};

/** "2025 – 2026", "2023 – aujourd'hui", "2021" */
const formatPeriod = (
  start: Date,
  end: Date | null,
  isCurrent: boolean,
  lang: Lang
): string => {
  const startYear = start.getFullYear();
  const now = lang === 'fr' ? "aujourd'hui" : 'present';

  if (isCurrent) return `${startYear} – ${now}`;
  if (!end) return String(startYear);

  const endYear = end.getFullYear();
  return startYear === endYear ? String(startYear) : `${startYear} – ${endYear}`;
};

/* ---------------- Formes de sortie ---------------- */

export interface CvSkillGroup {
  category: string;
  label: string;
  items: string[];
}

export interface CvEntry {
  title: string;
  subtitle: string;
  period: string;
  bullets: string[];
  tech: string[];
}

export interface CvData {
  lang: Lang;
  fullName: string;
  headline: string;
  contact: {
    email: string;
    phone: string;
    phoneAlt: string;
    location: string;
    birthDate: string;
  };
  profile: string;
  avatarUrl: string | null;
  skillGroups: CvSkillGroup[];
  languages: Array<{ name: string; level: string }>;
  interests: string[];
  experiences: CvEntry[];
  projects: CvEntry[];
  education: CvEntry[];
  certifications: CvEntry[];
  generatedAt: string;
}

/** Libellés imprimés en tête de chaque bloc de compétences. */
const CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
  FRONTEND: { fr: 'Frontend', en: 'Frontend' },
  BACKEND: { fr: 'Backend & API', en: 'Backend & API' },
  MOBILE: { fr: 'Mobile', en: 'Mobile' },
  DATABASE: { fr: 'Données', en: 'Data' },
  CLOUD: { fr: 'Cloud', en: 'Cloud' },
  DEVOPS: { fr: 'Outils & DevOps', en: 'Tools & DevOps' },
  CYBERSECURITY: { fr: 'Réseaux & sécurité', en: 'Networks & security' },
  OTHER: { fr: 'Autres', en: 'Other' },
};

/** Ordre d'affichage des blocs, indépendant de l'ordre alphabétique. */
const CATEGORY_ORDER = [
  'FRONTEND',
  'MOBILE',
  'BACKEND',
  'DATABASE',
  'DEVOPS',
  'CLOUD',
  'CYBERSECURITY',
  'OTHER',
];

export const buildCvData = async (lang: Lang = 'fr'): Promise<CvData> => {
  /*
   * Toutes les lectures partent en parallèle : le temps de réponse est celui
   * de la requête la plus lente, pas leur somme. Un CV se génère en une
   * fraction de seconde, ce qui autorise la régénération à chaque
   * téléchargement plutôt qu'un fichier figé à maintenir à la main.
   */
  const [profile, skills, experiences, projects, education, certifications] = await Promise.all([
    prisma.profile.findFirst(),
    prisma.skill.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }, { level: 'desc' }] }),
    prisma.experience.findMany({ orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }] }),
    prisma.project.findMany({
      orderBy: [{ order: 'asc' }, { date: 'desc' }],
      include: { skills: { include: { skill: { select: { name: true } } } } },
    }),
    prisma.education.findMany({ orderBy: [{ startDate: 'desc' }] }),
    prisma.certification.findMany({ orderBy: [{ issueDate: 'desc' }] }),
  ]);

  const fullName = profile
    ? `${profile.lastName.toUpperCase()} ${profile.firstName}`.trim()
    : 'Profil non configuré';

  /* ---- Compétences regroupées par catégorie ---- */
  const grouped = new Map<string, string[]>();
  for (const skill of skills) {
    const list = grouped.get(skill.category) ?? [];
    list.push(skill.name);
    grouped.set(skill.category, list);
  }

  const skillGroups: CvSkillGroup[] = CATEGORY_ORDER.filter((c) => grouped.has(c)).map((c) => ({
    category: c,
    label: CATEGORY_LABELS[c]?.[lang] ?? c,
    items: grouped.get(c) ?? [],
  }));

  /* ---- Expériences ---- */
  const cvExperiences: CvEntry[] = experiences.map((exp: (typeof experiences)[number]) => ({
    title: pick(exp.role, lang),
    subtitle: [exp.company, exp.location].filter(Boolean).join(', '),
    period: formatPeriod(exp.startDate, exp.endDate, exp.isCurrent, lang),
    bullets: (() => {
      const achievements = pickList(exp.achievements, lang);
      // Si aucune réalisation n'est saisie, la description sert de puce
      // unique : mieux vaut une ligne que rien du tout sous un intitulé.
      return achievements.length > 0 ? achievements : [pick(exp.description, lang)].filter(Boolean);
    })(),
    tech: [],
  }));

  /* ---- Projets ---- */
  const cvProjects: CvEntry[] = projects.map((project: (typeof projects)[number]) => ({
    title: project.title,
    subtitle: '',
    period: String(project.date.getFullYear()),
    bullets: [pick(project.description, lang)].filter(Boolean),
    // Les technologies viennent des compétences réellement liées au projet :
    // ajouter une techno à un projet la fait apparaître ici sans autre action.
    tech: project.skills.map((ps: { skill: { name: string } }) => ps.skill.name),
  }));

  /* ---- Formation ---- */
  const cvEducation: CvEntry[] = education.map((edu: (typeof education)[number]) => ({
    title: pick(edu.degree, lang),
    subtitle: [edu.school, edu.location].filter(Boolean).join(', '),
    period: formatPeriod(edu.startDate, edu.endDate, edu.isCurrent, lang),
    bullets: [pick(edu.description, lang)].filter(Boolean),
    tech: [],
  }));

  /* ---- Certifications ---- */
  const cvCertifications: CvEntry[] = certifications.map((cert: (typeof certifications)[number]) => ({
    title: cert.name,
    subtitle: cert.issuer,
    period: String(cert.issueDate.getFullYear()),
    bullets: [],
    tech: [],
  }));

  const languages = Array.isArray(profile?.languages)
    ? (profile.languages as Array<{ name: string; level: string }>)
    : [];

  return {
    lang,
    fullName,
    headline: pick(profile?.headline, lang) || pickList(profile?.titles, lang)[0] || '',
    contact: {
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
      phoneAlt: profile?.phoneAlt ?? '',
      location: profile?.location ?? '',
      birthDate: profile?.birthDate
        ? profile.birthDate.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '',
    },
    profile: pick(profile?.bio, lang),
    avatarUrl: profile?.avatarUrl ?? null,
    skillGroups,
    languages,
    interests: pickList(profile?.interests, lang),
    experiences: cvExperiences,
    projects: cvProjects,
    education: cvEducation,
    certifications: cvCertifications,
    generatedAt: new Date().toISOString(),
  };
};
