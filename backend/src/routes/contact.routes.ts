import { Router } from 'express';
import {
  createContactMessage,
  listContactMessages,
  updateContactMessage,
  deleteContactMessage,
} from '../controllers/contact.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import { contactLimiter, writeLimiter } from '../middlewares/rateLimit.middleware';
import {
  createContactMessageSchema,
  listMessagesQuerySchema,
  updateMessageSchema,
} from '../schemas/contact.schema';

const router = Router();

/* ---------- Public ---------- */
// contactLimiter est le limiteur le plus strict de l'application. C'est la
// seule route d'écriture ouverte sans compte : sans plafond, une boucle de
// quelques lignes remplit la table en une nuit.
router.post('/', contactLimiter, validateBody(createContactMessageSchema), createContactMessage);

/* ---------- Administration ---------- */
router.get(
  '/',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  validateQuery(listMessagesQuerySchema),
  listContactMessages
);

router.patch(
  '/:id',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  validateBody(updateMessageSchema),
  updateContactMessage
);

router.delete('/:id', protect, authorize('SUPERADMIN', 'ADMIN'), writeLimiter, deleteContactMessage);

export default router;
