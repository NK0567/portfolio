import { Router } from 'express';
import {
  getAllLabs,
  getLabBySlug,
  createLab,
  updateLab,
  deleteLab,
} from '../controllers/lab.controller';
import { protect, authorize, optionalAuth } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { writeLimiter } from '../middlewares/rateLimit.middleware';
import { createLabSchema, updateLabSchema } from '../schemas/lab.schema';

const router = Router();

/* ---------- Public (brouillons visibles pour l'admin connecté) ---------- */
router.get('/', optionalAuth, getAllLabs);
router.get('/:slug', optionalAuth, getLabBySlug);

/* ---------- Administration ---------- */
router.post(
  '/',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  validateBody(createLabSchema),
  createLab
);

router.put(
  '/:id',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  validateBody(updateLabSchema),
  updateLab
);

router.delete('/:id', protect, authorize('SUPERADMIN', 'ADMIN'), writeLimiter, deleteLab);

export default router;
