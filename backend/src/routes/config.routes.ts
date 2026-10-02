import { Router } from 'express';
import { getConfig, upsertConfig } from '../controllers/config.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { writeLimiter } from '../middlewares/rateLimit.middleware';
import { patchConfigSchema } from '../schemas/config.schema';

const router = Router();

router.get('/', getConfig);

router.put(
  '/',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  validateBody(patchConfigSchema),
  upsertConfig
);

export default router;
