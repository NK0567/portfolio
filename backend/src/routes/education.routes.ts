import { Router } from 'express';
import {
  getAllEducation,
  createEducation,
  updateEducation,
  deleteEducation,
} from '../controllers/education.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { writeLimiter } from '../middlewares/rateLimit.middleware';
import { createEducationSchema, updateEducationSchema } from '../schemas/education.schema';

const router = Router();

router.get('/', getAllEducation);

router.post(
  '/',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  validateBody(createEducationSchema),
  createEducation
);

router.put(
  '/:id',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  validateBody(updateEducationSchema),
  updateEducation
);

router.delete('/:id', protect, authorize('SUPERADMIN', 'ADMIN'), writeLimiter, deleteEducation);

export default router;
