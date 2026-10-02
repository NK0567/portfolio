import type { I18nList, I18nText } from '@/types/api';

/**
 * Lecture des champs bilingues.
 *
 * Le site affiche le français. La base, elle, stocke { fr, en } partout, et
 * le CV sait déjà produire les deux langues. Passer tout l'affichage par ces
 * deux fonctions permet d'ajouter un sélecteur de langue plus tard en
 * changeant un argument, au lieu de repasser sur chaque composant.
 *
 * Elles tolèrent aussi les données imparfaites : une chaîne simple au lieu
 * d'un objet, une langue vide, un champ null. Une section ne doit jamais
 * casser la page parce qu'une traduction manque.
 */

export type Lang = 'fr' | 'en';

export const text = (value: I18nText | string | null | undefined, lang: Lang = 'fr'): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.fr || value.en || '';
};

export const list = (value: I18nList | string[] | null | undefined, lang: Lang = 'fr'): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  const picked = value[lang] ?? value.fr ?? value.en;
  return Array.isArray(picked) ? picked : [];
};

/** "2024" ou "2023 - 2025" ou "2024 - aujourd'hui" */
export const period = (
  start: string,
  end: string | null,
  isCurrent: boolean,
  lang: Lang = 'fr'
): string => {
  const startYear = new Date(start).getFullYear();
  if (Number.isNaN(startYear)) return '';

  if (isCurrent) return `${startYear} - ${lang === 'fr' ? "aujourd'hui" : 'present'}`;
  if (!end) return String(startYear);

  const endYear = new Date(end).getFullYear();
  return startYear === endYear ? String(startYear) : `${startYear} - ${endYear}`;
};

/** "mars 2026" */
export const monthYear = (value: string, lang: Lang = 'fr'): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  });
};
