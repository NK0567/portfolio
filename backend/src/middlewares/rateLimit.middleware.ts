import rateLimit from 'express-rate-limit';

const jsonMessage = (message: string) => ({ success: false, message });

/**
 * Limite globale sur toute l'API.
 * Généreuse : elle vise l'abus automatisé, pas le visiteur normal.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: jsonMessage('Trop de requêtes. Réessaie dans quelques minutes.'),
});

/**
 * Limite stricte sur la connexion.
 *
 * `skipSuccessfulRequests` fait que seules les tentatives ÉCHOUÉES sont
 * comptées : tu peux te connecter autant de fois que tu veux, mais un
 * attaquant n'a droit qu'à 8 essais par quart d'heure. C'est la protection
 * la plus efficace contre le bourrinage de mots de passe.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: jsonMessage('Trop de tentatives de connexion. Réessaie dans 15 minutes.'),
});

/**
 * Limite sur les écritures (création, modification, suppression, upload).
 * Filet de sécurité au cas où un jeton d'administration fuiterait.
 */
export const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: jsonMessage("Trop d'opérations d'écriture. Réessaie dans quelques minutes."),
});

/**
 * Limite sur le formulaire de contact public (anti-spam).
 * Prêt à l'emploi pour l'étape où l'on branchera ContactMessage.
 */
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: jsonMessage('Trop de messages envoyés. Réessaie dans une heure.'),
});
