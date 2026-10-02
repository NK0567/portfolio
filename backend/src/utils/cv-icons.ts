type Doc = PDFKit.PDFDocument;

/**
 * Icônes vectorielles dessinées à la main.
 *
 * PDFKit n'a pas de police d'icônes : contrairement au HTML où l'on pose un
 * composant <Mail />, chaque pictogramme doit être tracé en primitives
 * géométriques. Ces fonctions dessinent dans un carré de `size` points dont
 * le coin supérieur gauche est en (x, y), ce qui permet de les aligner
 * simplement sur une ligne de texte.
 */

interface IconOptions {
  x: number;
  y: number;
  size: number;
  color: string;
}

/** Enveloppe — adresse email. */
export const drawMailIcon = (doc: Doc, { x, y, size, color }: IconOptions): void => {
  const h = size * 0.72;
  doc.save().lineWidth(0.9).strokeColor(color);

  doc.roundedRect(x, y + (size - h) / 2, size, h, 1).stroke();
  // Le rabat : deux traits partant des coins supérieurs vers le centre
  doc
    .moveTo(x, y + (size - h) / 2)
    .lineTo(x + size / 2, y + (size - h) / 2 + h * 0.58)
    .lineTo(x + size, y + (size - h) / 2)
    .stroke();

  doc.restore();
};

/** Combiné téléphonique. */
export const drawPhoneIcon = (doc: Doc, { x, y, size, color }: IconOptions): void => {
  doc.save().lineWidth(0.9).strokeColor(color);

  // Silhouette simplifiée d'un smartphone
  doc.roundedRect(x + size * 0.22, y, size * 0.56, size, 1.5).stroke();
  doc
    .moveTo(x + size * 0.42, y + size * 0.86)
    .lineTo(x + size * 0.58, y + size * 0.86)
    .stroke();

  doc.restore();
};

/** Épingle de localisation. */
export const drawPinIcon = (doc: Doc, { x, y, size, color }: IconOptions): void => {
  const cx = x + size / 2;
  const r = size * 0.32;
  const cy = y + r;

  doc.save().lineWidth(0.9).strokeColor(color);

  doc.circle(cx, cy, r).stroke();
  // La pointe, formée de deux segments partant des flancs du cercle
  doc
    .moveTo(cx - r * 0.78, cy + r * 0.62)
    .lineTo(cx, y + size)
    .lineTo(cx + r * 0.78, cy + r * 0.62)
    .stroke();

  doc.restore();
};

/** Calendrier — date de naissance. */
export const drawCalendarIcon = (doc: Doc, { x, y, size, color }: IconOptions): void => {
  const top = y + size * 0.16;
  const h = size * 0.84;

  doc.save().lineWidth(0.9).strokeColor(color);

  doc.roundedRect(x, top, size, h, 1).stroke();
  // Barre de l'en-tête
  doc
    .moveTo(x, top + h * 0.3)
    .lineTo(x + size, top + h * 0.3)
    .stroke();
  // Les deux anneaux
  doc
    .moveTo(x + size * 0.28, y)
    .lineTo(x + size * 0.28, top + h * 0.14)
    .stroke();
  doc
    .moveTo(x + size * 0.72, y)
    .lineTo(x + size * 0.72, top + h * 0.14)
    .stroke();

  doc.restore();
};

export type IconName = 'mail' | 'phone' | 'pin' | 'calendar';

export const ICONS: Record<IconName, (doc: Doc, options: IconOptions) => void> = {
  mail: drawMailIcon,
  phone: drawPhoneIcon,
  pin: drawPinIcon,
  calendar: drawCalendarIcon,
};
