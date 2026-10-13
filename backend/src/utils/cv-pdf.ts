import PDFDocument from 'pdfkit';
import type { CvData } from '../services/cv.service';
import { loadAvatar, getInitials } from './cv-assets';
import { ICONS, type IconName } from './cv-icons';

/**
 * Génère le PDF du CV avec PDFKit.
 *
 * PDFKit plutôt que Puppeteer : pas de navigateur headless à installer, pas
 * de 300 Mo de Chromium sur le serveur, un démarrage instantané et un
 * fonctionnement identique sur n'importe quel hébergeur. La contrepartie est
 * qu'il faut positionner les éléments soi-même, d'où les helpers ci-dessous.
 *
 * La mise en page reprend celle du CV existant : bandeau latéral sombre à
 * gauche (contact, compétences, langues) et colonne principale à droite
 * (profil, expérience, projets, formation).
 */

/* ---------------- Constantes de mise en page ---------------- */

const PAGE = { width: 595.28, height: 841.89 }; // A4 en points
const SIDEBAR_W = 190;
const MARGIN = 32;

const MAIN_X = SIDEBAR_W + 28;
const MAIN_W = PAGE.width - MAIN_X - MARGIN;


/**
 * Libellés fixes du CV dans les deux langues. Le CV anglais imprimait
 * jusqu'ici des titres français (« Expérience professionnelle »,
 * « Né le... ») : un recruteur anglophone le voit au premier coup d'œil.
 */
const LABELS = {
  fr: {
    contact: 'Contact',
    skills: 'Compétences',
    languages: 'Langues',
    interests: "Centres d'intérêt",
    profile: 'Profil',
    experience: 'Expérience professionnelle',
    projects: 'Projets',
    education: 'Formation',
    certifications: 'Certifications',
    born: 'Né le',
  },
  en: {
    contact: 'Contact',
    skills: 'Skills',
    languages: 'Languages',
    interests: 'Interests',
    profile: 'Profile',
    experience: 'Work experience',
    projects: 'Projects',
    education: 'Education',
    certifications: 'Certifications',
    born: 'Born',
  },
} as const;

const t = (cv: CvData) => LABELS[cv.lang === 'en' ? 'en' : 'fr'];

const COLORS = {
  sidebarBg: '#12263A',
  sidebarText: '#D6E0EA',
  sidebarMuted: '#94A9BC',
  sidebarHeading: '#FFFFFF',
  accent: '#1BA37E',
  heading: '#12263A',
  body: '#2B3A47',
  muted: '#6B7C8C',
  rule: '#D9E2EA',
};

type Doc = PDFKit.PDFDocument;

/** Coupe une chaîne trop longue pour ne pas déborder de la colonne. */
const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

/* ---------------- Bandeau latéral ---------------- */

const drawSidebarSection = (doc: Doc, title: string, y: number): number => {
  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(COLORS.sidebarHeading)
    .text(title.toUpperCase(), MARGIN, y, { width: SIDEBAR_W - MARGIN * 2, characterSpacing: 1.4 });

  const afterTitle = doc.y + 4;

  doc
    .moveTo(MARGIN, afterTitle)
    .lineTo(SIDEBAR_W - MARGIN, afterTitle)
    .lineWidth(0.6)
    .strokeColor(COLORS.accent)
    .stroke();

  return afterTitle + 8;
};

const drawSidebar = (doc: Doc, cv: CvData, avatar: Buffer | null): void => {
  // Fond du bandeau, sur toute la hauteur de la page
  doc.rect(0, 0, SIDEBAR_W, PAGE.height).fill(COLORS.sidebarBg);

  const innerW = SIDEBAR_W - MARGIN * 2;
  let y = 32;

  /* --- Photo de profil --- */
  const photoSize = 96;
  const photoX = (SIDEBAR_W - photoSize) / 2;

  if (avatar) {
    doc.save();
    /*
     * Le masque circulaire : on définit un cercle comme zone de découpe, puis
     * on dessine l'image par-dessus. Tout ce qui déborde du cercle est écarté.
     * `cover` conserve les proportions et recadre au centre, comme le
     * object-fit du CSS, ce qui évite les visages écrasés.
     */
    doc.circle(photoX + photoSize / 2, y + photoSize / 2, photoSize / 2).clip();
    doc.image(avatar, photoX, y, { cover: [photoSize, photoSize], align: 'center', valign: 'center' });
    doc.restore();

    // Liseré assorti à la couleur d'accent
    doc
      .circle(photoX + photoSize / 2, y + photoSize / 2, photoSize / 2)
      .lineWidth(1.5)
      .strokeColor(COLORS.accent)
      .stroke();
  } else {
    // Repli : les initiales dans un cercle, plutôt qu'un trou dans la page.
    doc.circle(photoX + photoSize / 2, y + photoSize / 2, photoSize / 2).fill('#1E3A52');
    doc
      .circle(photoX + photoSize / 2, y + photoSize / 2, photoSize / 2)
      .lineWidth(1.5)
      .strokeColor(COLORS.accent)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(30)
      .fillColor(COLORS.sidebarHeading)
      .text(getInitials(cv.fullName), photoX, y + photoSize / 2 - 15, {
        width: photoSize,
        align: 'center',
      });
  }

  y += photoSize + 16;

  /* --- Nom --- */
  doc
    .font('Helvetica-Bold')
    .fontSize(15)
    .fillColor(COLORS.sidebarHeading)
    .text(cv.fullName, MARGIN, y, { width: innerW, lineGap: 1, align: 'center' });

  y = doc.y + 5;

  if (cv.headline) {
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(COLORS.accent)
      .text(cv.headline, MARGIN, y, { width: innerW, lineGap: 1.5, align: 'center' });
    y = doc.y + 16;
  }

  /* --- Contact --- */
  const contactCandidates: Array<{ icon: IconName; text: string }> = [
    { icon: 'mail', text: cv.contact.email },
    { icon: 'phone', text: cv.contact.phone },
    { icon: 'phone', text: cv.contact.phoneAlt },
    { icon: 'pin', text: cv.contact.location },
    { icon: 'calendar', text: cv.contact.birthDate ? `${t(cv).born} ${cv.contact.birthDate}` : '' },
  ];
  const contactLines = contactCandidates.filter((line) => Boolean(line.text));

  if (contactLines.length > 0) {
    y = drawSidebarSection(doc, t(cv).contact, y);

    const iconSize = 8;
    const textX = MARGIN + iconSize + 6;

    for (const line of contactLines) {
      // L'icône est tracée à 1 point sous la ligne de base du texte pour
      // compenser la hauteur d'x de la police et paraître alignée à l'oeil.
      ICONS[line.icon](doc, { x: MARGIN, y: y + 1, size: iconSize, color: COLORS.accent });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.sidebarText)
        .text(line.text, textX, y, { width: innerW - iconSize - 6 });

      y = doc.y + 5;
    }
    y += 10;
  }

  /* --- Compétences, groupées par catégorie --- */
  if (cv.skillGroups.length > 0) {
    y = drawSidebarSection(doc, t(cv).skills, y);

    for (const group of cv.skillGroups) {
      // Garde-fou : si le bandeau est plein, on cesse d'écrire plutôt que
      // de laisser le texte déborder hors de la page.
      if (y > PAGE.height - 120) break;

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(COLORS.sidebarHeading)
        .text(group.label, MARGIN, y, { width: innerW });
      y = doc.y + 2;

      doc
        .font('Helvetica')
        .fontSize(7.8)
        .fillColor(COLORS.sidebarText)
        .text(group.items.join(' · '), MARGIN, y, { width: innerW, lineGap: 1.5 });
      y = doc.y + 9;
    }
    y += 4;
  }

  /* --- Langues --- */
  if (cv.languages.length > 0 && y < PAGE.height - 110) {
    y = drawSidebarSection(doc, t(cv).languages, y);
    for (const lang of cv.languages) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.sidebarText).text(lang.name, MARGIN, y, {
        width: innerW,
        continued: true,
      });
      doc.font('Helvetica').fillColor(COLORS.sidebarMuted).text(` : ${lang.level}`);
      y = doc.y + 4;
    }
    y += 10;
  }

  /* --- Centres d'intérêt --- */
  if (cv.interests.length > 0 && y < PAGE.height - 80) {
    y = drawSidebarSection(doc, t(cv).interests, y);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.sidebarText)
      .text(cv.interests.join(' · '), MARGIN, y, { width: innerW, lineGap: 1.5 });
  }
};

/* ---------------- Colonne principale ---------------- */

/**
 * Réserve la place nécessaire ; ajoute une page si le bloc ne tient pas.
 * Le bandeau latéral est redessiné vierge sur les pages suivantes pour
 * conserver l'identité visuelle sans répéter les informations.
 */
const ensureSpace = (doc: Doc, needed: number): void => {
  if (doc.y + needed > PAGE.height - MARGIN) {
    doc.addPage();
    doc.rect(0, 0, SIDEBAR_W, PAGE.height).fill(COLORS.sidebarBg);
    doc.y = MARGIN;
  }
};

const drawMainHeading = (doc: Doc, title: string): void => {
  ensureSpace(doc, 46);

  const y = doc.y;
  doc
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor(COLORS.accent)
    .text(title.toUpperCase(), MAIN_X, y, { width: MAIN_W, characterSpacing: 1.2 });

  const lineY = doc.y + 3;
  doc
    .moveTo(MAIN_X, lineY)
    .lineTo(MAIN_X + MAIN_W, lineY)
    .lineWidth(0.8)
    .strokeColor(COLORS.accent)
    .stroke();

  doc.y = lineY + 10;
};

const drawEntry = (
  doc: Doc,
  entry: { title: string; subtitle: string; period: string; bullets: string[]; tech: string[] }
): void => {
  ensureSpace(doc, 60);

  const startY = doc.y;

  // Période alignée à droite, sur la même ligne que l'intitulé
  if (entry.period) {
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(entry.period, MAIN_X, startY, { width: MAIN_W, align: 'right' });
  }

  // La largeur est réduite pour ne pas passer sous la période
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(COLORS.heading)
    .text(truncate(entry.title, 78), MAIN_X, startY, { width: MAIN_W - 70 });

  if (entry.subtitle) {
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(COLORS.accent)
      .text(entry.subtitle, MAIN_X, doc.y + 1, { width: MAIN_W });
  }

  doc.y += 3;

  for (const bullet of entry.bullets) {
    if (!bullet) continue;
    ensureSpace(doc, 24);

    const bulletY = doc.y;
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted).text('•', MAIN_X + 2, bulletY);
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLORS.body)
      .text(bullet, MAIN_X + 12, bulletY, { width: MAIN_W - 12, lineGap: 1.5 });
    doc.y += 2;
  }

  if (entry.tech.length > 0) {
    ensureSpace(doc, 18);
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(entry.tech.join(' · '), MAIN_X + 12, doc.y + 1, { width: MAIN_W - 12 });
  }

  doc.y += 11;
};

/* ---------------- Point d'entrée ---------------- */

/**
 * Construit le PDF et le renvoie sous forme de Buffer.
 *
 * Le Buffer permet au contrôleur de fixer Content-Length et de servir le
 * fichier d'un bloc, ce qui évite les téléchargements tronqués observés avec
 * un flux interrompu.
 */
export const generateCvPdf = async (cv: CvData): Promise<Buffer> => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: {
      Title: `CV - ${cv.fullName}`,
      Author: cv.fullName,
      Subject: cv.headline,
      Creator: 'Portfolio',
    },
    autoFirstPage: true,
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // La photo est chargée avant tout tracé : PDFKit écrit en flux, on ne peut
  // pas revenir en arrière pour l'insérer après coup.
  const avatar = await loadAvatar(cv.avatarUrl);
  drawSidebar(doc, cv, avatar);

  // Le curseur de la colonne principale démarre indépendamment du bandeau
  doc.y = 48;

  if (cv.profile) {
    drawMainHeading(doc, t(cv).profile);
    doc
      .font('Helvetica')
      .fontSize(8.8)
      .fillColor(COLORS.body)
      .text(cv.profile, MAIN_X, doc.y, { width: MAIN_W, align: 'justify', lineGap: 2 });
    doc.y += 14;
  }

  if (cv.experiences.length > 0) {
    drawMainHeading(doc, t(cv).experience);
    cv.experiences.forEach((entry) => drawEntry(doc, entry));
  }

  if (cv.projects.length > 0) {
    drawMainHeading(doc, t(cv).projects);
    cv.projects.forEach((entry) => drawEntry(doc, entry));
  }

  if (cv.education.length > 0) {
    drawMainHeading(doc, t(cv).education);
    cv.education.forEach((entry) => drawEntry(doc, entry));
  }

  if (cv.certifications.length > 0) {
    drawMainHeading(doc, t(cv).certifications);
    cv.certifications.forEach((entry) => drawEntry(doc, entry));
  }

  doc.end();
  return finished;
};
