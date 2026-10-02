import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError } from '../utils/AppError';
import { isProd } from '../config/env';

/** Attrape toutes les routes non définies et renvoie un 404 JSON (jamais du HTML). */
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} introuvable.`,
  });
};

/**
 * Gestionnaire d'erreurs unique de l'application.
 *
 * Express 5 transmet automatiquement les promesses rejetées ici :
 * les contrôleurs n'ont donc plus besoin du moindre try/catch.
 *
 * Règle de sécurité : on ne renvoie au client que des messages
 * volontairement rédigés. Un message brut de Prisma peut révéler
 * des noms de tables, de colonnes ou de contraintes.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Erreurs métier explicites
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  // 2. Validation Zod : on liste précisément les champs fautifs
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.') || '(racine)',
      message: issue.message,
    }));

    /*
     * En développement, l'échec de validation est affiché dans le terminal du
     * serveur, avec les clés effectivement reçues. Sans cette trace, un 422
     * n'apparaît que dans l'onglet Réseau du navigateur — et le bandeau
     * d'erreur du frontend est souvent masqué par la surcouche de Next.js,
     * ce qui rend le diagnostic inutilement pénible.
     */
    if (!isProd) {
      console.warn(
        `\n[422] Validation échouée sur ${req.method} ${req.originalUrl}\n` +
          `      Champs reçus : ${Object.keys(req.body ?? {}).join(', ') || '(aucun)'}\n` +
          errors.map((e) => `      X ${e.field} : ${e.message}`).join('\n')
      );
      console.warn('      Corps reçu :', JSON.stringify(req.body ?? {}).slice(0, 800), '\n');
    }

    res.status(422).json({ success: false, message: 'Données invalides.', errors });
    return;
  }

  // 3. Erreurs d'upload Multer
  if (err instanceof MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'Fichier trop volumineux.',
      LIMIT_FILE_COUNT: 'Trop de fichiers envoyés.',
      LIMIT_UNEXPECTED_FILE: `Champ de fichier inattendu : "${err.field}".`,
    };
    if (!isProd) {
      console.warn(`\n[400] Multer : ${err.code} sur le champ "${err.field}"\n`);
    }
    res.status(400).json({
      success: false,
      message: messages[err.code] ?? "Erreur lors de l'envoi du fichier.",
    });
    return;
  }

  // 4. Erreurs Prisma connues, traduites en messages sûrs
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (!isProd) {
      console.warn(`\n[Prisma ${err.code}] ${err.message.slice(0, 400)}\n`);
    }
    switch (err.code) {
      case 'P2002':
        res.status(409).json({
          success: false,
          message: 'Cette valeur existe déjà et doit être unique.',
        });
        return;
      case 'P2025':
        res.status(404).json({ success: false, message: 'Ressource introuvable.' });
        return;
      case 'P2003':
        res.status(409).json({
          success: false,
          message: 'Référence invalide vers une ressource liée.',
        });
        return;
      default:
        break;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ success: false, message: 'Requête mal formée.' });
    return;
  }

  // 5. Tout le reste : journalisé côté serveur, masqué côté client
  console.error(`[ERREUR NON GÉRÉE] ${req.method} ${req.originalUrl}`, err);

  res.status(500).json({
    success: false,
    message: 'Une erreur interne est survenue.',
    // La stack n'est exposée qu'en développement, jamais en production
    ...(isProd ? {} : { debug: err instanceof Error ? err.message : String(err) }),
  });
};