import { Router } from 'express';
import {
  listCoverLetters,
  getTemplates,
  getCoverLetter,
  renderCoverLetter,
  createCoverLetter,
  updateCoverLetter,
  duplicateCoverLetter,
  deleteCoverLetter,
  previewCoverLetterPdf,
  downloadCoverLetterPdf,
} from '../controllers/cover-letter.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import { writeLimiter } from '../middlewares/rateLimit.middleware';
import {
  createCoverLetterSchema,
  updateCoverLetterSchema,
  renderQuerySchema,
  listQuerySchema,
} from '../schemas/cover-letter.schema';

const router = Router();

/**
 * Aucune route publique dans ce fichier.
 *
 * `protect` et `authorize` sont posés sur le routeur entier plutôt que ligne
 * par ligne : c'est la seule forme qui reste correcte quand on ajoutera une
 * route dans six mois sans relire ce fichier. Une route privée oubliée est un
 * accident qui ne se voit pas en recette, puisque l'application marche.
 */
router.use(protect, authorize('SUPERADMIN', 'ADMIN'));

/* --- Lecture --- */
router.get('/', validateQuery(listQuerySchema), listCoverLetters);
// Déclaré avant /:id, sinon « templates » serait pris pour un identifiant.
router.get('/templates', getTemplates);
router.get('/:id', getCoverLetter);
router.get('/:id/render', renderCoverLetter);
router.get('/:id/preview', previewCoverLetterPdf);
router.get('/:id/download', validateQuery(renderQuerySchema), downloadCoverLetterPdf);

/* --- Écriture --- */
router.post('/', writeLimiter, validateBody(createCoverLetterSchema), createCoverLetter);
router.post('/:id/duplicate', writeLimiter, duplicateCoverLetter);
router.put('/:id', writeLimiter, validateBody(updateCoverLetterSchema), updateCoverLetter);
router.delete('/:id', writeLimiter, deleteCoverLetter);

export default router;
