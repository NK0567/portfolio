import { Router } from 'express';
import { getProfile, upsertProfile, uploadCv } from '../controllers/profile.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import {
  uploadAvatar,
  uploadDocument,
  mapFileToBody,
} from '../middlewares/upload.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { writeLimiter } from '../middlewares/rateLimit.middleware';
import { patchProfileSchema } from '../schemas/profile.schema';

const router = Router();

router.get('/', getProfile);

// uploadAvatar (et non uploadImage) : la photo finit dans le PDF du CV, or
// PDFKit ne décode que le JPEG et le PNG. On refuse donc WebP/AVIF/GIF ici.
router.put(
  '/',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  uploadAvatar.single('avatar'),
  mapFileToBody('avatarUrl'),
  validateBody(patchProfileSchema),
  upsertProfile
);

// Le CV est un PDF : il passe par uploadDocument, pas par uploadImage.
router.post(
  '/cv',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  uploadDocument.single('cv'),
  uploadCv
);

export default router;
