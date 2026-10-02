import { api } from '@/lib/api';

/**
 * Configuration globale du site.
 *
 * Ce service manquait complètement. Le backend exposait `GET /api/config` et
 * `PUT /api/config` depuis le début, mais aucun écran ne les appelait :
 * `GlobalConfig` n'était modifiable qu'à la main en base. Les liens réseaux
 * du pied de page, le badge de disponibilité et les métadonnées de
 * référencement restaient donc vides en permanence.
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  defaultMode: ThemeMode;
  fontHeading: string;
  fontBody: string;
}

export interface SeoConfig {
  title: { fr: string; en: string };
  description: { fr: string; en: string };
  keywords: string[];
  ogImage: string;
}

export interface GlobalConfig {
  id: string;
  siteName: string;
  isAvailable: boolean;
  freelanceStatus: string | null;
  themeConfig: ThemeConfig;
  seoConfig: SeoConfig;
  socialLinks: Record<string, string>;
  languages: string[];
  sectionOrder: string[];
  updatedAt?: string;
}

/**
 * Charge utile d'une mise à jour.
 *
 * Tous les champs sont facultatifs : le schéma serveur est un `.partial()`,
 * et le contrôleur fait un `upsert` avec exactement ce qu'il reçoit.
 * Changer la seule couleur d'accent ne doit pas vider les liens sociaux.
 *
 * Attention toutefois : `themeConfig` et `seoConfig` sont validés comme des
 * objets COMPLETS. On ne peut pas envoyer `themeConfig: { accentColor }` seul,
 * il faut renvoyer l'objet entier. C'est voulu côté serveur, ça évite qu'une
 * mise à jour partielle laisse une palette à moitié définie.
 */
export interface ConfigInput {
  siteName?: string;
  isAvailable?: boolean;
  freelanceStatus?: string | null;
  themeConfig?: ThemeConfig;
  seoConfig?: SeoConfig;
  socialLinks?: Record<string, string>;
  languages?: string[];
  sectionOrder?: string[];
}

/** Repli utilisé quand la configuration n'a jamais été enregistrée. */
export const DEFAULT_CONFIG: Omit<GlobalConfig, 'id'> = {
  siteName: 'Portfolio',
  isAvailable: true,
  freelanceStatus: 'Disponible',
  themeConfig: {
    primaryColor: '#12263A',
    accentColor: '#0E8A68',
    defaultMode: 'system',
    fontHeading: 'IBM Plex Sans',
    fontBody: 'IBM Plex Sans',
  },
  seoConfig: {
    title: { fr: '', en: '' },
    description: { fr: '', en: '' },
    keywords: [],
    ogImage: '',
  },
  socialLinks: {},
  languages: ['fr', 'en'],
  sectionOrder: ['hero', 'projects', 'skills', 'experience', 'contact'],
};

export const configService = {
  /** Lecture publique, aucune authentification requise. */
  async get(): Promise<GlobalConfig> {
    const { data } = await api.get('/config');
    const config = data.data as Partial<GlobalConfig>;

    /*
     * Fusion avec les valeurs par défaut.
     *
     * Le contrôleur renvoie DEFAULT_CONFIG tant que rien n'a été enregistré,
     * mais une configuration créée par une ancienne version peut très bien
     * avoir un `themeConfig` incomplet. Lire `config.themeConfig.accentColor`
     * sans garde planterait l'écran sur une valeur manquante.
     */
    return {
      id: config.id ?? 'current_config',
      siteName: config.siteName ?? DEFAULT_CONFIG.siteName,
      isAvailable: config.isAvailable ?? DEFAULT_CONFIG.isAvailable,
      freelanceStatus: config.freelanceStatus ?? DEFAULT_CONFIG.freelanceStatus,
      themeConfig: { ...DEFAULT_CONFIG.themeConfig, ...(config.themeConfig ?? {}) },
      seoConfig: {
        ...DEFAULT_CONFIG.seoConfig,
        ...(config.seoConfig ?? {}),
        title: { ...DEFAULT_CONFIG.seoConfig.title, ...(config.seoConfig?.title ?? {}) },
        description: {
          ...DEFAULT_CONFIG.seoConfig.description,
          ...(config.seoConfig?.description ?? {}),
        },
        keywords: Array.isArray(config.seoConfig?.keywords) ? config.seoConfig.keywords : [],
      },
      socialLinks:
        config.socialLinks && typeof config.socialLinks === 'object' ? config.socialLinks : {},
      languages: Array.isArray(config.languages) ? config.languages : DEFAULT_CONFIG.languages,
      sectionOrder: Array.isArray(config.sectionOrder)
        ? config.sectionOrder
        : DEFAULT_CONFIG.sectionOrder,
      updatedAt: config.updatedAt,
    };
  },

  /** Enregistrement (administration). */
  async save(payload: ConfigInput): Promise<GlobalConfig> {
    const { data } = await api.put('/config', payload);
    return data.data as GlobalConfig;
  },
};
