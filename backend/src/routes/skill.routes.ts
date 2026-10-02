import { Router } from 'express';
import {
  createSkill,
  getAllSkills,
  updateSkill,
  deleteSkill,
} from '../controllers/skill.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import { uploadImage, mapFileToBody } from '../middlewares/upload.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { writeLimiter } from '../middlewares/rateLimit.middleware';
import { createSkillSchema, updateSkillSchema } from '../schemas/skill.schema';

const router = Router();

router.get('/', getAllSkills);

router.post(
  '/',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  uploadImage.single('logo'),
  mapFileToBody('logoUrl'),
  validateBody(createSkillSchema),
  createSkill
);

router.put(
  '/:id',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  uploadImage.single('logo'),
  mapFileToBody('logoUrl'),
  validateBody(updateSkillSchema),
  updateSkill
);

router.delete('/:id', protect, authorize('SUPERADMIN', 'ADMIN'), writeLimiter, deleteSkill);

export default router;
