import { Router } from 'express';
import {
  createProject,
  getAllProjects,
  getProjectBySlug,
  updateProject,
  deleteProject,
} from '../controllers/project.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import { uploadImage, mapFileToBody } from '../middlewares/upload.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { writeLimiter } from '../middlewares/rateLimit.middleware';
import { createProjectSchema, updateProjectSchema } from '../schemas/project.schema';

const router = Router();

/* ---------- Public ---------- */
router.get('/', getAllProjects);
router.get('/:slug', getProjectBySlug);

/* ---------- Administration ----------
 * L'ordre des middlewares est important :
 *   1. protect / authorize  -> on ne stocke pas un fichier venant d'un inconnu
 *   2. uploadImage          -> Multer remplit req.file ET req.body (multipart)
 *   3. mapFileToBody        -> recopie le chemin du fichier dans req.body.mainImage
 *   4. validateBody         -> Zod valide un body enfin complet
 */
router.post(
  '/',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  uploadImage.single('coverImage'),
  mapFileToBody('mainImage'),
  validateBody(createProjectSchema),
  createProject
);

router.put(
  '/:id',
  protect,
  authorize('SUPERADMIN', 'ADMIN'),
  writeLimiter,
  uploadImage.single('coverImage'),
  mapFileToBody('mainImage'),
  validateBody(updateProjectSchema),
  updateProject
);

router.delete('/:id', protect, authorize('SUPERADMIN', 'ADMIN'), writeLimiter, deleteProject);

export default router;
