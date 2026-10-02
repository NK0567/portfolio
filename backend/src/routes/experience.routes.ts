import { Router } from 'express';
import {
  createExperience,
  getAllExperiences,
  updateExperience,
  deleteExperience,
} from '../controllers/experience.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import { uploadImage, mapFileToBody } from '../middlewares/upload.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { writeLimiter } from '../middlewares/rateLimit.middleware';
import {
  createExperienceSchema,
  updateExperienceSchema,
} from '../schemas/experience.schema';

const router = Router();

router.get('/', getAllExperiences);

router.post(
  '/',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  uploadImage.single('logo'),
  mapFileToBody('logoUrl'),
  validateBody(createExperienceSchema),
  createExperience
);

router.put(
  '/:id',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  uploadImage.single('logo'),
  mapFileToBody('logoUrl'),
  validateBody(updateExperienceSchema),
  updateExperience
);

router.delete('/:id', protect, authorize('SUPERADMIN', 'ADMIN'), writeLimiter, deleteExperience);

export default router;
