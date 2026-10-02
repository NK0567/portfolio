import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Valide et NORMALISE req.body à partir d'un schéma Zod.
 *
 * Le body est remplacé par le résultat du parsing : valeurs par défaut
 * appliquées, nombres coercés, chaînes JSON du multipart transformées en
 * objets. Le contrôleur reçoit donc des données propres et typées, et n'a
 * plus le moindre parsing à faire.
 *
 * Les ZodError remontent naturellement au gestionnaire d'erreurs,
 * qui les transforme en réponse 422 détaillée champ par champ.
 */
export const validateBody =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };

/**
 * Même principe pour les paramètres d'URL (?page=2&limit=20).
 *
 * Sur Express 5, `req.query` est en lecture seule : le résultat validé
 * est donc déposé dans `res.locals.query`, que le contrôleur relit
 * via getValidatedQuery().
 */
export const validateQuery =
  (schema: ZodType) =>
  (req: Request, res: Response, next: NextFunction): void => {
    res.locals.query = schema.parse(req.query);
    next();
  };

/** Relit la query validée depuis un contrôleur, avec le bon type. */
export const getValidatedQuery = <T>(res: Response): T => res.locals.query as T;
