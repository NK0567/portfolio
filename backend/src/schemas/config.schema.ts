import { z } from 'zod';
import { jsonField } from './common.schema';

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale attendue (ex: #0f172a).');

/** Palette et typographie pilotées depuis l'administration. */
const themeConfig = z.object({
  primaryColor: hexColor,
  accentColor: hexColor,
  defaultMode: z.enum(['light', 'dark', 'system']).default('system'),
  fontHeading: z.string().default('Inter'),
  fontBody: z.string().default('Inter'),
});

/** Métadonnées SEO par défaut, déclinées par langue. */
const seoConfig = z.object({
  title: z.object({ fr: z.string().max(70), en: z.string().max(70) }),
  description: z.object({ fr: z.string().max(180), en: z.string().max(180) }),
  keywords: z.array(z.string()).default([]),
  ogImage: z.string().default(''),
});

const socialLinks = z.record(z.string(), z.string());

/** Forme de base sans défauts (voir l'explication dans project.schema.ts). */
const configShape = {
  siteName: z.string().min(1).max(80),
  isAvailable: z.coerce.boolean(),
  freelanceStatus: z.string().max(60).nullable().optional(),
  themeConfig: jsonField(themeConfig),
  seoConfig: jsonField(seoConfig),
  socialLinks: jsonField(socialLinks),
  languages: jsonField(z.array(z.string())),
  // Ordre d'affichage des sections de la page d'accueil
  sectionOrder: jsonField(z.array(z.string())),
};

export const upsertConfigSchema = z.object({
  ...configShape,
  siteName: configShape.siteName.default('Portfolio'),
  isAvailable: configShape.isAvailable.default(true),
  socialLinks: configShape.socialLinks.default({}),
  languages: configShape.languages.default(['fr', 'en']),
  sectionOrder: configShape.sectionOrder.default([]),
});

/**
 * Mise à jour partielle : changer la seule couleur d'accent ne doit pas
 * réinitialiser le nom du site ni vider les liens sociaux.
 */
export const patchConfigSchema = z.object(configShape).partial();

export type UpsertConfigInput = z.infer<typeof upsertConfigSchema>;

/** Valeurs utilisées lors de la toute première création de la configuration. */
export const DEFAULT_CONFIG = {
  siteName: 'Portfolio',
  isAvailable: true,
  freelanceStatus: 'Disponible',
  themeConfig: {
    primaryColor: '#0f172a',
    accentColor: '#2563eb',
    defaultMode: 'system',
    fontHeading: 'Inter',
    fontBody: 'Inter',
  },
  seoConfig: {
    title: { fr: 'Portfolio', en: 'Portfolio' },
    description: { fr: '', en: '' },
    keywords: [],
    ogImage: '',
  },
  socialLinks: {},
  languages: ['fr', 'en'],
  sectionOrder: ['hero', 'about', 'skills', 'projects', 'experience', 'contact'],
};
