import prisma from '../config/db';
import { AppError } from '../utils/AppError';

/**
 * Assemblage d'une lettre de motivation prête à imprimer.
 *
 * Même principe que le CV : l'identité de l'expéditeur n'est jamais ressaisie,
 * elle est lue dans la table Profile. Changer son numéro de téléphone dans les
 * paramètres met donc à jour toutes les lettres d'un coup.
 *
 * Ce qui diffère du CV : le corps est écrit à la main, parce qu'une lettre de
 * motivation ne se déduit d'aucune donnée. La valeur ajoutée est ailleurs,
 * dans les variables : un texte unique, réutilisé pour vingt candidatures,
 * où seules l'entreprise et le poste changent.
 */

export type Lang = 'fr' | 'en';

export interface CoverLetterRender {
  id: string;
  title: string;
  lang: Lang;

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

  /** Variables écrites dans le texte mais impossibles à résoudre. */
  missingVariables: string[];
  /** Le profil n'est pas encore renseigné : l'en-tête sera vide. */
  profileMissing: boolean;
  stats: {
    words: number;
    characters: number;
    paragraphs: number;
    /** Estimation du nombre de pages du PDF, 1 étant la cible. */
    estimatedPages: number;
  };
}

/* ---------------- Variables ---------------- */

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Deux écritures sont acceptées pour chaque variable, française et anglaise.
 * Écrire {{entreprise}} ou {{company}} revient au même : on ne veut pas qu'une
 * lettre cesse de se remplir parce qu'elle a été dupliquée vers l'anglais.
 */
const ALIASES: Record<string, string> = {
  entreprise: 'company',
  company: 'company',
  poste: 'position',
  position: 'position',
  destinataire: 'recipient',
  recipient: 'recipient',
  ville: 'companyCity',
  city: 'companyCity',
  nom: 'fullName',
  name: 'fullName',
  email: 'email',
  telephone: 'phone',
  phone: 'phone',
  titre: 'headline',
  headline: 'headline',
  date: 'date',
};

interface Variables {
  company: string;
  position: string;
  recipient: string;
  companyCity: string;
  fullName: string;
  email: string;
  phone: string;
  headline: string;
  date: string;
}

/**
 * Remplace les variables et signale celles qui n'ont pas pu l'être.
 *
 * Une variable inconnue ou vide n'est pas effacée en silence : elle est
 * remplacée par [entreprise], en clair et entre crochets. Si la lettre part
 * quand même, le trou se voit immédiatement à la relecture au lieu de
 * produire une phrase amputée qui a l'air correcte.
 */
const resolve = (
  text: string,
  vars: Variables,
  missing: Set<string>
): string =>
  text.replace(PLACEHOLDER, (_match, rawKey: string) => {
    const key = ALIASES[rawKey.toLowerCase()];
    const value = key ? (vars as unknown as Record<string, string>)[key] : undefined;

    if (!value) {
      missing.add(rawKey);
      return `[${rawKey}]`;
    }
    return value;
  });

/* ---------------- Dates ---------------- */

/** « Douala, le 1er octobre 2026 » / « Douala, October 1, 2026 » */
const buildDateLine = (city: string, lang: Lang): string => {
  const now = new Date();

  if (lang === 'en') {
    const formatted = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return city ? `${city}, ${formatted}` : formatted;
  }

  const day = now.getDate();
  const month = now.toLocaleDateString('fr-FR', { month: 'long' });
  // En français, seul le premier jour du mois prend « 1er ».
  const dayLabel = day === 1 ? '1er' : String(day);
  const formatted = `le ${dayLabel} ${month} ${now.getFullYear()}`;

  return city ? `${city}, ${formatted}` : formatted;
};

/* ---------------- Statistiques ---------------- */

const countWords = (text: string): number =>
  text.split(/\s+/).filter(Boolean).length;

/**
 * Estimation du nombre de pages.
 *
 * Mesurée sur la mise en page réelle du PDF : à 10,5 pt sur une colonne de
 * 495 points, une page absorbe environ 2 600 caractères de corps une fois
 * l'en-tête, l'objet et la signature déduits. Le but n'est pas la précision
 * au caractère près, c'est de prévenir avant le téléchargement plutôt que
 * de laisser découvrir la seconde page.
 */
const estimatePages = (paragraphs: string[]): number => {
  const chars = paragraphs.join(' ').length;
  const breaks = paragraphs.length * 110; // espacement entre blocs
  return Math.max(1, Math.ceil((chars + breaks) / 2600));
};

/* ---------------- Rendu ---------------- */

export const buildCoverLetterRender = async (id: string): Promise<CoverLetterRender> => {
  const [letter, profile] = await Promise.all([
    prisma.coverLetter.findUnique({ where: { id } }),
    prisma.profile.findFirst(),
  ]);

  if (!letter) throw AppError.notFound('Lettre introuvable.');

  const lang: Lang = letter.lang === 'en' ? 'en' : 'fr';

  const fullName = profile
    ? `${profile.firstName} ${profile.lastName.toUpperCase()}`.trim()
    : '';

  const headline = (() => {
    const value = profile?.headline;
    if (!value) return '';
    if (typeof value === 'string') return value;
    const obj = value as Record<string, unknown>;
    return String(obj[lang] ?? obj.fr ?? obj.en ?? '');
  })();

  const vars: Variables = {
    company: letter.company ?? '',
    position: letter.position ?? '',
    recipient: letter.recipient ?? '',
    companyCity: letter.companyCity ?? '',
    fullName,
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
    headline,
    date: buildDateLine('', lang).replace(/^le /, ''),
  };

  const missing = new Set<string>();

  /*
   * Le corps est stocké en JSON. Prisma renvoie `JsonValue`, pas `string[]` :
   * si la colonne a été modifiée à la main en base, on peut recevoir n'importe
   * quoi. On filtre plutôt que de faire confiance au typage.
   */
  const rawBody = Array.isArray(letter.body) ? (letter.body as unknown[]) : [];
  const paragraphs = rawBody
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .map((p) => resolve(p.trim(), vars, missing));

  const subject = resolve(letter.subject, vars, missing);
  const salutation = resolve(letter.salutation, vars, missing);
  const closing = resolve(letter.closing, vars, missing);

  const recipientBlock = [
    letter.recipient ?? '',
    letter.company ?? '',
    letter.companyCity ?? '',
  ].filter(Boolean);

  const allText = [subject, salutation, ...paragraphs, closing].join(' ');

  return {
    id: letter.id,
    title: letter.title,
    lang,
    sender: {
      fullName,
      headline,
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
      location: profile?.location ?? '',
    },
    company: letter.company ?? '',
    position: letter.position ?? '',
    recipientBlock,
    dateLine: buildDateLine(profile?.location ?? '', lang),
    subject,
    salutation,
    paragraphs,
    closing,
    signature: letter.signature?.trim() || fullName,
    missingVariables: [...missing],
    profileMissing: !profile,
    stats: {
      words: countWords(allText),
      characters: allText.length,
      paragraphs: paragraphs.length,
      estimatedPages: estimatePages(paragraphs),
    },
  };
};

/* ---------------- Modèles de départ ---------------- */

/**
 * Structure en quatre temps, celle qui tient en une page et que les
 * recruteurs lisent jusqu'au bout :
 *   1. pourquoi eux, précisément, et pas n'importe qui ;
 *   2. ce que je sais faire, prouvé par un fait concret ;
 *   3. ce que j'apporte à leur problème à eux ;
 *   4. une demande d'entretien nette.
 *
 * Le texte ci-dessous est un point de départ réécrit depuis l'interface, pas
 * un modèle à envoyer tel quel. Les crochets signalent ce qui doit être
 * remplacé à la main, les {{variables}} ce qui se remplit tout seul.
 */
export const LETTER_TEMPLATES: Record<Lang, {
  title: string;
  subject: string;
  salutation: string;
  body: string[];
  closing: string;
}> = {
  fr: {
    title: 'Modèle - Développeur Full Stack',
    subject: 'Candidature au poste de {{poste}}',
    salutation: 'Madame, Monsieur,',
    body: [
      "Votre annonce pour le poste de {{poste}} a retenu mon attention parce que [point précis : un produit, une techno de votre stack, un enjeu que vous citez]. C'est exactement le type de sujet sur lequel je travaille depuis [X] ans, et la raison pour laquelle je vous écris aujourd'hui plutôt qu'à une autre entreprise.",
      "Titulaire d'un Master 2 en génie informatique, spécialité sécurité des systèmes d'information et des communications, je conçois des applications de bout en bout : interfaces Next.js et Flutter, API Node.js et NestJS, modélisation de données et mise en production. Sur [projet le plus proche de leur besoin], j'ai [résultat mesurable : temps de réponse divisé par deux, X utilisateurs, telle fonctionnalité livrée en N semaines].",
      "Ce que je peux apporter à {{entreprise}} tient en trois points : une habitude du code lisible et testé plutôt que du code livré vite, une sensibilité à la sécurité acquise en formation et appliquée dès la conception, et l'expérience de l'enseignement, qui oblige à expliquer clairement ses choix techniques à ceux qui ne les partagent pas encore.",
      "Je serais heureux de vous exposer tout cela de vive voix et de répondre à vos questions. Mon portfolio et mes réalisations détaillées sont disponibles à l'adresse indiquée ci-dessus.",
    ],
    closing:
      "Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
  },
  en: {
    title: 'Template - Full Stack Developer',
    subject: 'Application for the {{position}} role',
    salutation: 'Dear Hiring Manager,',
    body: [
      "Your opening for the {{position}} role caught my attention because of [specific detail: a product, a technology in your stack, a challenge you mention]. That is precisely the kind of problem I have been working on for the past [X] years, and the reason I am writing to you rather than to another company.",
      "I hold a Master's degree in Computer Engineering, majoring in information systems and communications security, and I build applications end to end: Next.js and Flutter interfaces, Node.js and NestJS APIs, data modelling and deployment. On [closest project to their need], I [measurable outcome: halved response times, X users, feature shipped in N weeks].",
      "What I can bring to {{company}} comes down to three things: a habit of writing readable, tested code rather than fast code, a security mindset acquired through formal training and applied from the design stage, and teaching experience, which forces you to explain technical choices clearly to people who do not share them yet.",
      "I would welcome the opportunity to discuss this with you and answer your questions. My portfolio and detailed work are available at the address above.",
    ],
    closing: 'Thank you for your time and consideration. I look forward to hearing from you.',
  },
};
