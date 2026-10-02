import { Role } from '@prisma/client';

/**
 * Augmentation du type Request d'Express.
 *
 * Permet d'écrire `req.user.id` partout avec l'autocomplétion et la
 * vérification de type, au lieu du `(req as any).user` qui traînait
 * dans les anciens contrôleurs.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};
