import path from 'path';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { env, isProd, corsOrigins } from './config/env';
import { globalLimiter } from './middlewares/rateLimit.middleware';
import { notFound, errorHandler } from './middlewares/error.middleware';

import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import skillRoutes from './routes/skill.routes';
import experienceRoutes from './routes/experience.routes';
import profileRoutes from './routes/profile.routes';
import configRoutes from './routes/config.routes';
import adminRoutes from './routes/admin.routes';
import auditRoutes from './routes/audit.routes';
import educationRoutes from './routes/education.routes';
import cvRoutes from './routes/cv.routes';
import contactRoutes from './routes/contact.routes';
import coverLetterRoutes from './routes/cover-letter.routes';
import uploadRoutes from './routes/upload.routes';
import labRoutes from './routes/lab.routes';

const app: Application = express();

/*
 * Derrière un reverse proxy (Nginx, Railway, Render...), l'IP vue par Express
 * est celle du proxy. Sans ce réglage, le limiteur de débit compterait tous
 * les visiteurs comme un seul client et bloquerait tout le monde d'un coup.
 * On met 1 (et non `true`) : `true` fait confiance à n'importe quel
 * X-Forwarded-For, ce qui permettrait de contourner le rate limiting.
 */
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ---------------- Sécurité ---------------- */
app.use(
  helmet({
    // Les images servies depuis /uploads doivent rester chargeables par le
    // frontend, qui est sur une autre origine.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: isProd ? undefined : false,
  })
);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true, // indispensable pour le cookie httpOnly du refresh token
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

/* ---------------- Parsing ---------------- */
// Limite volontairement basse : aucune route JSON n'a besoin de plus.
// Les gros volumes passent par multipart, géré séparément par Multer.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

/* ---------------- Fichiers statiques ---------------- */
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../public/uploads'), {
    maxAge: isProd ? '30d' : 0,
    // Les noms de fichiers étant aléatoires, on ne veut pas exposer
    // la liste du répertoire.
    index: false,
    dotfiles: 'ignore',
  })
);

/* ---------------- Santé ---------------- */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    env: env.NODE_ENV,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/* ---------------- API ---------------- */
app.use('/api', globalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/config', configRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/experiences', experienceRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/cover-letters', coverLetterRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit', auditRoutes);

/* ---------------- Gestion des erreurs ----------------
 * Ces deux middlewares doivent rester les DERNIERS déclarés :
 * Express les évalue dans l'ordre d'enregistrement.
 */
app.use(notFound);
app.use(errorHandler);

export default app;
