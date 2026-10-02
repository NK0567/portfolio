import { Router } from 'express';
import { getCvData, downloadCv, previewCv } from '../controllers/cv.controller';

const router = Router();

// Entièrement public : le CV est fait pour être consulté et téléchargé.
router.get('/', getCvData);
router.get('/download', downloadCv);
router.get('/preview', previewCv);

export default router;
