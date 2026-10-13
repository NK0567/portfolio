/**
 * Types des réponses de l'API.
 *
 * Ils décrivent EXACTEMENT ce que renvoie le backend Prisma. C'est ce fichier
 * qui aurait signalé au build les deux erreurs récentes (`ps.skill.name` et le
 * payload de création) au lieu de les laisser exploser dans le navigateur.
 *
 * Règle : aucun `any` dans les composants qui consomment l'API.
 */

/* ---------------- Primitives ---------------- */

/** Tout le contenu textuel est bilingue en base. */
export interface I18nText {
  fr: string;
  en: string;
}

export interface I18nList {
  fr: string[];
  en: string[];
}

/** Enveloppe standard de toutes les réponses du backend. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

/** Erreur de validation renvoyée avec un statut 422. */
export interface ApiValidationError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

/* ---------------- Compétences ---------------- */

export type SkillCategory =
  | 'FRONTEND'
  | 'BACKEND'
  | 'MOBILE'
  | 'CLOUD'
  | 'CYBERSECURITY'
  | 'DEVOPS'
  | 'DATABASE'
  | 'OTHER';

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  FRONTEND: 'Frontend',
  BACKEND: 'Backend',
  MOBILE: 'Mobile',
  CLOUD: 'Cloud',
  CYBERSECURITY: 'Cybersécurité',
  DEVOPS: 'DevOps',
  DATABASE: 'Base de données',
  OTHER: 'Autre',
};

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: number;
  yearsOfExp: number;
  logoUrl: string | null;
  description: I18nText;
  order: number;
}

/** Version allégée renvoyée à l'intérieur d'un projet. */
export interface SkillSummary {
  id: string;
  name: string;
  category: SkillCategory;
  logoUrl: string | null;
  level: number;
}

/* ---------------- Projets ---------------- */

export type ProjectStatus = 'COMPLETED' | 'DEVELOPMENT' | 'MAINTENANCE' | 'ARCHIVED';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  COMPLETED: 'Terminé',
  DEVELOPMENT: 'En développement',
  MAINTENANCE: 'En maintenance',
  ARCHIVED: 'Archivé',
};

export interface Project {
  id: string;
  title: string;
  slug: string;
  description: I18nText;
  content: I18nText;
  mainImage: string;
  images: string[];
  videoUrl: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  documentation: string | null;
  status: ProjectStatus;
  architecture: Record<string, unknown>;
  features: I18nList;
  challenges: I18nText;
  order: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  /**
   * ATTENTION : le backend APLATIT la table de jonction.
   * C'est un tableau de compétences, pas de lignes ProjectSkill.
   * On écrit donc `skill.name`, jamais `ps.skill.name`.
   */
  skills: SkillSummary[];
}

/* ---------------- Profil et configuration ---------------- */

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  cvUrlFr: string | null;
  cvUrlEn: string | null;
  bio: I18nText;
  titles: I18nList;

  /* Coordonnées imprimées sur le CV généré */
  email: string | null;
  phone: string | null;
  phoneAlt: string | null;
  location: string | null;
  birthDate: string | null;
  headline: I18nText | null;
  languages: Array<{ name: string; level: string; nameEn?: string; levelEn?: string }> | null;
  interests: I18nList | null;
}

export interface GlobalConfig {
  id: string;
  siteName: string;
  isAvailable: boolean;
  freelanceStatus: string | null;
  themeConfig: {
    primaryColor: string;
    accentColor: string;
    defaultMode: 'light' | 'dark' | 'system';
    fontHeading: string;
    fontBody: string;
  };
  seoConfig: {
    title: I18nText;
    description: I18nText;
    keywords: string[];
    ogImage: string;
  };
  socialLinks: Record<string, string>;
  languages: string[];
  sectionOrder: string[];
}


/* ---------------- Expériences et formation ---------------- */

export interface Experience {
  id: string;
  company: string;
  logoUrl: string | null;
  location: string;
  role: I18nText;
  description: I18nText;
  achievements: I18nList;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  order: number;
  createdAt: string;
}

export interface Education {
  id: string;
  degree: I18nText;
  school: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: I18nText | null;
  order: number;
  createdAt: string;
}

/* ---------------- Labs de sécurité ---------------- */

export const LAB_PLATFORMS = ['HTB', 'TryHackMe', 'Root-Me', 'PortSwigger', 'VulnHub', 'Custom'] as const;
export type LabPlatform = (typeof LAB_PLATFORMS)[number];

export const LAB_PLATFORM_LABELS: Record<LabPlatform, string> = {
  HTB: 'Hack The Box',
  TryHackMe: 'TryHackMe',
  'Root-Me': 'Root-Me',
  PortSwigger: 'PortSwigger Academy',
  VulnHub: 'VulnHub',
  Custom: 'Lab personnel',
};

export const LAB_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Insane'] as const;
export type LabDifficulty = (typeof LAB_DIFFICULTIES)[number];

export const LAB_DIFFICULTY_LABELS: Record<LabDifficulty, string> = {
  Easy: 'Facile',
  Medium: 'Moyen',
  Hard: 'Difficile',
  Insane: 'Extrême',
};

export interface CyberLab {
  id: string;
  slug: string;
  title: string;
  platform: LabPlatform;
  difficulty: LabDifficulty;
  category: string | null;
  badgeUrl: string | null;
  writeUpUrl: string | null;
  summary: I18nText;
  /** Absent de la liste publique : seul le détail embarque le write-up. */
  content?: I18nText;
  remediation?: I18nText;
  techniques: string[];
  tools: string[];
  isPublished: boolean;
  order: number;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- CV généré ---------------- */

export interface CvEntry {
  title: string;
  subtitle: string;
  period: string;
  bullets: string[];
  tech: string[];
}

export interface CvData {
  lang: 'fr' | 'en';
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
  skillGroups: Array<{ category: SkillCategory; label: string; items: string[] }>;
  languages: Array<{ name: string; level: string }>;
  interests: string[];
  experiences: CvEntry[];
  projects: CvEntry[];
  education: CvEntry[];
  certifications: CvEntry[];
  generatedAt: string;
}

/* ---------------- Authentification ---------------- */

export type Role = 'SUPERADMIN' | 'ADMIN' | 'GUEST';

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
}
