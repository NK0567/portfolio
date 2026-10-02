/**
 * Erreur métier explicite.
 *
 * Toute erreur lancée avec cette classe est considérée comme "attendue" :
 * son message est sûr et peut être renvoyé tel quel au client.
 * Toutes les autres erreurs sont masquées derrière un 500 générique
 * par le gestionnaire d'erreurs (voir middlewares/error.middleware.ts).
 */
export class AppError extends Error {
  public readonly isOperational = true;

  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message = 'Requête invalide.', code?: string) {
    return new AppError(400, message, code);
  }

  static unauthorized(message = 'Authentification requise.', code?: string) {
    return new AppError(401, message, code);
  }

  static forbidden(message = 'Accès interdit.', code?: string) {
    return new AppError(403, message, code);
  }

  static notFound(message = 'Ressource introuvable.', code?: string) {
    return new AppError(404, message, code);
  }

  static conflict(message = 'Conflit avec une ressource existante.', code?: string) {
    return new AppError(409, message, code);
  }

  static tooMany(message = 'Trop de requêtes.', code?: string) {
    return new AppError(429, message, code);
  }
}
