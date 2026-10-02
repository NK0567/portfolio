import { Router } from 'express';
import { getStats, getLogs } from '../controllers/admin.controller';
import { protect, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/stats', protect, authorize('SUPERADMIN', 'ADMIN'), getStats);
router.get('/logs', protect, authorize('SUPERADMIN', 'ADMIN'), getLogs);

export default router;
