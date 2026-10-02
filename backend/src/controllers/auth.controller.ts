import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../config/db';
import { env, isProd } from '../config/env';
import { AppError } from '../utils/AppError';
import { createAuditLog, getClientIp } from '../utils/logger';
import { LoginInput, RegisterInput, ChangePasswordInput } from '../schemas/auth.schema';

const REFRESH_COOKIE = 'refreshToken';
const BCRYPT_ROUNDS = 12;

/**
 * Options du cookie portant le refresh token.
 *
 * `sameSite: 'lax'` en développement (frontend et backend sur localhost,
 * ports différents) et `'none'` + `secure` en production, où le frontend
 * (Vercel) et l'API (Railway/VPS) sont sur des domaines distincts.
 * Avec 'strict', le cookie ne serait tout simplement jamais envoyé en prod.
 */
const refreshCookieOptions = {
  httpOnly: true, // inaccessible au JavaScript : immunisé au vol par XSS
  secure: isProd,
  sameSite: isProd ? ('none' as const) : ('lax' as const),
  path: '/',
  maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
};

const signAccessToken = (userId: string, email: string, role: string): string =>
  jwt.sign({ id: userId, email, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRY,
  } as SignOptions);

const signRefreshToken = (userId: string): string =>
  jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_EXPIRY_DAYS}d`,
  } as SignOptions);

/** Crée la session en base et pose le cookie. */
const issueSession = async (
  req: Request,
  res: Response,
  user: { id: string; email: string; role: string }
): Promise<string> => {
  const refreshToken = signRefreshToken(user.id);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: getClientIp(req),
      expiresAt,
    },
  });

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  return signAccessToken(user.id, user.email, user.role);
};

/**
 * Création du tout premier compte administrateur.
 * Se referme définitivement dès qu'un utilisateur existe.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, username, password } = req.body as RegisterInput;

  const alreadyInitialized = await prisma.user.findFirst({ select: { id: true } });
  if (alreadyInitialized) {
    throw AppError.forbidden(
      'Un compte administrateur est déjà configuré sur cette plateforme.',
      'ALREADY_INITIALIZED'
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, username, passwordHash, role: 'SUPERADMIN' },
    select: { id: true, username: true, email: true, role: true },
  });

  await createAuditLog(req, {
    action: 'ADMIN_SETUP',
    resource: 'Auth',
    userId: user.id,
    details: { email: user.email },
  });

  res.status(201).json({
    success: true,
    message: 'Compte administrateur créé avec succès.',
    data: user,
  });
};

/** Connexion. */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });

  /*
   * Le hachage est exécuté même quand l'utilisateur n'existe pas, sur un
   * hash factice. Sans cela, une réponse instantanée trahirait l'absence du
   * compte, et un attaquant pourrait énumérer les emails valides au chrono.
   */
  const hashToCompare =
    user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
  const isMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !isMatch) {
    await createAuditLog(req, {
      action: 'LOGIN_FAILED',
      resource: 'Auth',
      userId: user?.id ?? null,
      details: { email },
    });
    // Message volontairement identique dans les deux cas.
    throw AppError.unauthorized('Identifiants invalides.', 'INVALID_CREDENTIALS');
  }

  const accessToken = await issueSession(req, res, user);

  await createAuditLog(req, { action: 'LOGIN_SUCCESS', resource: 'Auth', userId: user.id });

  res.status(200).json({
    success: true,
    accessToken,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
};

/**
 * Renouvellement du jeton d'accès, AVEC ROTATION du refresh token.
 *
 * L'ancienne session est détruite et une nouvelle créée à chaque appel.
 * Un refresh token intercepté devient donc inutilisable dès que le
 * propriétaire légitime s'est reconnecté une fois.
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;

  if (!token) {
    throw AppError.unauthorized('Session absente.', 'NO_SESSION');
  }

  const session = await prisma.session.findUnique({
    where: { refreshToken: token },
    include: { user: { select: { id: true, email: true, username: true, role: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    throw AppError.unauthorized('Session expirée. Reconnecte-toi.', 'SESSION_EXPIRED');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
    if (decoded.id !== session.userId) throw new Error('mismatch');
  } catch {
    // Signature invalide sur un token pourtant présent en base : anomalie.
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    await createAuditLog(req, {
      action: 'REFRESH_TOKEN_TAMPERED',
      resource: 'Auth',
      userId: session.userId,
    });
    throw AppError.forbidden('Jeton de session altéré.', 'TOKEN_TAMPERED');
  }

  // Rotation : on retire l'ancienne session avant d'en émettre une nouvelle.
  await prisma.session.delete({ where: { id: session.id } });
  const accessToken = await issueSession(req, res, session.user);

  res.status(200).json({ success: true, accessToken, user: session.user });
};

/** Utilisateur actuellement connecté. */
export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });

  if (!user) throw AppError.unauthorized('Session invalide.');

  res.status(200).json({ success: true, user });
};

/** Déconnexion : la session est supprimée en base, pas seulement le cookie. */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;

  if (token) {
    await prisma.session.deleteMany({ where: { refreshToken: token } });
  }

  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  await createAuditLog(req, { action: 'LOGOUT', resource: 'Auth' });

  res.status(200).json({ success: true, message: 'Déconnexion réussie.' });
};

/** Changement de mot de passe : révoque toutes les autres sessions. */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized('Session invalide.');

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    await createAuditLog(req, { action: 'PASSWORD_CHANGE_FAILED', resource: 'Auth' });
    throw AppError.unauthorized('Mot de passe actuel incorrect.');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    // Toute session ouverte ailleurs est invalidée : c'est le comportement
    // attendu si le changement fait suite à une suspicion de compromission.
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  await createAuditLog(req, { action: 'PASSWORD_CHANGED', resource: 'Auth' });

  res.status(200).json({
    success: true,
    message: 'Mot de passe modifié. Toutes les sessions ont été révoquées.',
  });
};
