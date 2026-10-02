import { Request } from 'express';
import prisma from '../config/db';

export interface LogOptions {
  /** ex: "PROJECT_CREATE", "LOGIN_SUCCESS", "SKILL_DELETE" */
  action: string;
  /** ex: "Project", "Auth", "Skill" */
  resource: string;
  /** Métadonnées libres (identifiants concernés, diffs...) */
  details?: Record<string, unknown>;
  /** Forcé uniquement quand req.user n'est pas disponible (ex: login échoué) */
  userId?: string | null;
}

/** Extrait l'IP réelle du client (utile derrière un reverse proxy). */
export const getClientIp = (req: Request): string | null => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? null;
};

/**
 * Enregistre une action sensible dans la table AuditLog.
 *
 * Ne lance jamais d'exception : un échec d'écriture du journal
 * ne doit pas faire échouer l'opération métier qui a réussi.
 */
export const createAuditLog = async (req: Request, options: LogOptions): Promise<void> => {
  try {
    const userId = options.userId ?? req.user?.id ?? null;

    await prisma.auditLog.create({
      data: {
        userId,
        action: options.action,
        resource: options.resource,
        details: (options.details ?? {}) as object,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] ?? null,
      },
    });
  } catch (error) {
    console.error(
      `[AuditLog] Écriture impossible pour l'action ${options.action} :`,
      error instanceof Error ? error.message : error
    );
  }
};
