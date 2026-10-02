import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../config/db';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

interface AccessTokenPayload {
  id: string;
  email: string;
  role: Role;
}

/**
 * Vérifie le jeton d'accès et attache l'utilisateur à la requête.
 *
 * Deux différences notables avec la version précédente :
 *  - plus aucun secret de repli codé en dur (env.ts garantit sa présence) ;
 *  - les erreurs passent par AppError, donc par le gestionnaire central,
 *    ce qui uniformise le format des réponses.
 */
export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const header = req.headers.authorization;
    const token =
      header?.startsWith('Bearer ') ? header.slice(7) : (req.cookies?.accessToken as string | undefined);

    if (!token) {
      throw AppError.unauthorized("Accès refusé. Aucun jeton d'authentification fourni.", 'NO_TOKEN');
    }

    let decoded: AccessTokenPayload;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch (error) {
      // On distingue le jeton expiré du jeton falsifié : le frontend
      // déclenche un /auth/refresh sur TOKEN_EXPIRED, et une déconnexion sinon.
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized("Jeton d'authentification expiré.", 'TOKEN_EXPIRED');
      }
      throw AppError.unauthorized("Jeton d'authentification invalide.", 'TOKEN_INVALID');
    }

    // On relit l'utilisateur en base : un compte supprimé ou dont le rôle a
    // changé ne doit pas continuer à agir avec les droits gravés dans le jeton.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw AppError.unauthorized("L'utilisateur lié à ce jeton n'existe plus.", 'USER_GONE');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Contrôle d'accès basé sur les rôles (RBAC).
 * À placer systématiquement APRÈS `protect`.
 */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Authentification requise.'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        AppError.forbidden(
          `Accès interdit. Ton rôle (${req.user.role}) ne permet pas cette action.`,
          'INSUFFICIENT_ROLE'
        )
      );
      return;
    }

    next();
  };

/** Raccourci lisible pour les routes d'administration. */
export const adminOnly = [protect, authorize('SUPERADMIN', 'ADMIN')];

/**
 * Authentification FACULTATIVE.
 *
 * Utilisée sur les routes publiques dont le contenu dépend de qui regarde
 * (GET /api/labs : brouillons visibles pour l'admin, publié seulement pour
 * le visiteur). Une seule route et un seul filtre, plutôt que deux routes
 * qui finiraient par diverger.
 *
 * Ne lève jamais d'erreur : un jeton absent, expiré ou falsifié fait
 * simplement traiter la requête comme anonyme. Seul un compte ADMIN ou
 * SUPERADMIN existant en base est attaché à req.user.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;
  const token =
    header?.startsWith('Bearer ') ? header.slice(7) : (req.cookies?.accessToken as string | undefined);

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });
    if (user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN')) {
      req.user = user;
    }
  } catch {
    // Jeton invalide : requête anonyme, sans plus.
  }

  next();
};

/** Vrai si la requête vient d'un administrateur authentifié. */
export const isAdminRequest = (req: Request): boolean =>
  req.user?.role === 'ADMIN' || req.user?.role === 'SUPERADMIN';
