import { Router } from 'express';
import { uploadSingleImage, deleteUpload } from '../controllers/upload.controller';
import { protect, authorize } from '../middlewares/auth.middleware';
import { uploadImage } from '../middlewares/upload.middleware';
import { writeLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

/*
 * Aucune route publique.
 *
 * Un dépôt de fichiers ouvert est l'une des portes les plus exploitées sur un
 * site : espace disque saturé en quelques heures, hébergement de contenu
 * illégal sous ton nom de domaine, et dans le pire des cas exécution de code
 * si le serveur sert le dossier en PHP. Le filtre de type et le nom aléatoire
 * posés par Multer limitent le dernier risque, l'authentification supprime
 * les deux premiers.
 */
router.use(protect, authorize('SUPERADMIN', 'ADMIN'));

router.post('/image', writeLimiter, uploadImage.single('file'), uploadSingleImage);
router.delete('/', writeLimiter, deleteUpload);

export default router;
