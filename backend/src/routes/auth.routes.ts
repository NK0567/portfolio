import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  me,
  changePassword,
} from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { authLimiter } from '../middlewares/rateLimit.middleware';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '../schemas/auth.schema';

const router = Router();

// Création du premier admin : limitée elle aussi, car c'est une route publique
// tant qu'aucun compte n'existe.
router.post('/setup-admin', authLimiter, validateBody(registerSchema), register);

router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);

router.get('/me', protect, me);
router.post('/change-password', protect, validateBody(changePasswordSchema), changePassword);

export default router;
