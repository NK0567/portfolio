import PDFDocument from 'pdfkit';
import type { CoverLetterRender } from '../services/cover-letter.service';

/**
 * PDF de la lettre de motivation.
 *
 * Même outil et même palette que le CV, pour que les deux documents reçus
 * dans le même e-mail aient visiblement la même origine. La mise en page
 * suit en revanche la convention de la lettre d'affaires : expéditeur à
 * gauche, destinataire à droite, date, objet, corps justifié, signature.
 *
 * Aucun bandeau sombre ici, contrairement au CV : une lettre imprimée sur du
 * papier A4 dans une imprimante de bureau doit rester lisible et ne pas vider
 * une cartouche d'encre à chaque tirage.
 */

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const CONTENT_W = PAGE.width - MARGIN * 2;

const COLORS = {
  accent: '#1BA37E',
  heading: '#12263A',
  body: '#2B3A47',
  muted: '#6B7C8C',
  rule: '#D9E2EA',
};

type Doc = PDFKit.PDFDocument;

/** Ajoute une page si le bloc à venir ne tient plus en bas de celle-ci. */
const ensureSpace = (doc: Doc, needed: number): void => {
  if (doc.y + needed > PAGE.height - MARGIN) {
    doc.addPage();
    doc.y = MARGIN;
  }
};

/* ---------------- En-tête expéditeur ---------------- */

const drawSender = (doc: Doc, cl: CoverLetterRender): void => {
  const { sender } = cl;

  if (sender.fullName) {
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(COLORS.heading)
      .text(sender.fullName, MARGIN, MARGIN, { width: CONTENT_W * 0.6 });
  }

  if (sender.headline) {
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(COLORS.accent)
      .text(sender.headline, MARGIN, doc.y + 1, { width: CONTENT_W * 0.6 });
  }

  // Coordonnées sur une seule ligne, séparées par des points médians.
  const contact = [sender.location, sender.phone, sender.email].filter(Boolean).join('  ·  ');
  if (contact) {
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(contact, MARGIN, doc.y + 4, { width: CONTENT_W * 0.7 });
  }

  const ruleY = doc.y + 10;
  doc
    .moveTo(MARGIN, ruleY)
    .lineTo(MARGIN + CONTENT_W, ruleY)
    .lineWidth(1)
    .strokeColor(COLORS.accent)
    .stroke();

  doc.y = ruleY + 26;
};

/* ---------------- Destinataire et date ---------------- */

const drawRecipient = (doc: Doc, cl: CoverLetterRender): void => {
  const blockW = CONTENT_W * 0.45;
  const blockX = MARGIN + CONTENT_W - blockW;
  const startY = doc.y;

  if (cl.recipientBlock.length > 0) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.heading);
    cl.recipientBlock.forEach((line, index) => {
      doc.font(index === 0 ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(line, blockX, index === 0 ? startY : doc.y + 1, {
        width: blockW,
        align: 'right',
      });
    });
  }

  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(COLORS.muted)
    .text(cl.dateLine, blockX, doc.y + 12, { width: blockW, align: 'right' });

  doc.y += 26;
};

/* ---------------- Objet ---------------- */

const drawSubject = (doc: Doc, cl: CoverLetterRender): void => {
  ensureSpace(doc, 50);

  const label = cl.lang === 'fr' ? 'Objet : ' : 'Subject: ';
  const y = doc.y;

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.heading);
  const labelW = doc.widthOfString(label);

  doc.text(label, MARGIN, y, { continued: false });
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(COLORS.body)
    .text(cl.subject, MARGIN + labelW, y, { width: CONTENT_W - labelW });

  doc.y += 22;
};

/* ---------------- Corps ---------------- */

const drawBody = (doc: Doc, cl: CoverLetterRender): void => {
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(COLORS.body)
    .text(cl.salutation, MARGIN, doc.y, { width: CONTENT_W });

  doc.y += 12;

  for (const paragraph of cl.paragraphs) {
    // 60 points : de quoi loger deux lignes et éviter qu'un paragraphe
    // commence par une ligne orpheline en pied de page.
    ensureSpace(doc, 60);

    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor(COLORS.body)
      .text(paragraph, MARGIN, doc.y, {
        width: CONTENT_W,
        align: 'justify',
        lineGap: 2.5,
      });

    doc.y += 11;
  }

  ensureSpace(doc, 40);
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(COLORS.body)
    .text(cl.closing, MARGIN, doc.y + 4, { width: CONTENT_W, align: 'justify', lineGap: 2.5 });
};

/* ---------------- Signature ---------------- */

const drawSignature = (doc: Doc, cl: CoverLetterRender): void => {
  ensureSpace(doc, 70);

  const blockW = CONTENT_W * 0.4;
  const blockX = MARGIN + CONTENT_W - blockW;

  doc.y += 26;

  doc
    .moveTo(blockX, doc.y)
    .lineTo(blockX + blockW * 0.55, doc.y)
    .lineWidth(0.8)
    .strokeColor(COLORS.rule)
    .stroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor(COLORS.heading)
    .text(cl.signature, blockX, doc.y + 8, { width: blockW, align: 'left' });
};

/* ---------------- Point d'entrée ---------------- */

/**
 * Construit le PDF et le renvoie en Buffer.
 *
 * Le Buffer, et non un flux branché sur la réponse : il permet de poser un
 * Content-Length exact et d'envoyer le fichier d'un bloc. Un flux interrompu
 * en cours de route produit un PDF tronqué qu'Acrobat refuse d'ouvrir, sans
 * que le serveur ait signalé la moindre erreur.
 */
export const generateCoverLetterPdf = async (cl: CoverLetterRender): Promise<Buffer> => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: {
      Title: `Lettre de motivation - ${cl.sender.fullName || cl.title}`,
      Author: cl.sender.fullName || cl.title,
      Subject: cl.subject,
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

  drawSender(doc, cl);
  drawRecipient(doc, cl);
  drawSubject(doc, cl);
  drawBody(doc, cl);
  drawSignature(doc, cl);

  doc.end();
  return finished;
};
