import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import { validateQuery } from '../middlewares/validate.middleware';
import { paginationSchema } from '../schemas/common.schema';

const router = Router();

// Le journal complet contient des IP et des tentatives de connexion :
// réservé au SUPERADMIN, jamais aux ADMIN ordinaires.
router.get(
  '/',
  protect,
  authorize('SUPERADMIN'),
  validateQuery(paginationSchema),
  getAuditLogs
);

export default router;
