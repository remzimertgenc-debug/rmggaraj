import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import crypto from 'node:crypto';
import { DatabaseOperationError } from '../db/index.ts';
import { getOrCreateUser } from '../db/users.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUserId?: number;
  botActor?: 'cron_secret' | 'admin_user';
}

const MIN_CRON_SECRET_LENGTH = 32;

function timingSafeEquals(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function getConfiguredCronSecret(): string {
  return (
    process.env.BOT_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ''
  );
}

function getConfiguredAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Bu işlem için Google hesabınızla giriş yapmalısınız.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || ''
    );
    req.dbUserId = dbUser.id;
    next();
  } catch (error) {
    if (error instanceof DatabaseOperationError) {
      return res.status(503).json({ error: error.message });
    }
    console.error('Error verifying Firebase ID token:', error);
    return res
      .status(401)
      .json({ error: 'Oturum doğrulanamadı. Lütfen yeniden giriş yapın.' });
  }
};

export const requireBotAdminOrCron = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const configuredSecret = getConfiguredCronSecret();
  const hasValidConfiguredSecret =
    configuredSecret.length >= MIN_CRON_SECRET_LENGTH;

  if (configuredSecret.length > 0 && !hasValidConfiguredSecret) {
    console.warn(
      `[Security] BOT_CRON_SECRET uzunluğu güvenli eşiğin (${MIN_CRON_SECRET_LENGTH} karakter) altında olduğu için secret doğrulaması devre dışı bırakıldı.`
    );
  }

  const cronHeaderRaw = req.headers['x-cron-secret'];
  const cronHeader =
    typeof cronHeaderRaw === 'string'
      ? cronHeaderRaw.trim()
      : Array.isArray(cronHeaderRaw)
        ? String(cronHeaderRaw[0] ?? '').trim()
        : '';

  if (cronHeader) {
    if (hasValidConfiguredSecret && timingSafeEquals(cronHeader, configuredSecret)) {
      req.botActor = 'cron_secret';
      return next();
    }
    return res
      .status(403)
      .json({ error: 'Geçersiz fiyat botu cron anahtarı.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error:
        'Fiyat botunu çalıştırmak için BOT_CRON_SECRET veya yetkili yönetici oturumu gereklidir.',
    });
  }

  const bearerToken = authHeader.slice('Bearer '.length).trim();
  if (!bearerToken) {
    return res.status(401).json({ error: 'Yetkilendirme bilgisi boş olamaz.' });
  }

  if (hasValidConfiguredSecret && timingSafeEquals(bearerToken, configuredSecret)) {
    req.botActor = 'cron_secret';
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(bearerToken);
    const adminEmails = getConfiguredAdminEmails();
    const hasAdminClaim =
      decodedToken.admin === true || decodedToken.role === 'admin';
    const normalizedEmail = decodedToken.email?.trim().toLowerCase() ?? '';
    const isAdminEmail =
      Boolean(normalizedEmail) &&
      decodedToken.email_verified !== false &&
      adminEmails.has(normalizedEmail);

    if (!hasAdminClaim && !isAdminEmail) {
      return res.status(403).json({
        error: 'Bu işlem yalnızca yetkili yöneticiler tarafından çalıştırılabilir.',
      });
    }

    req.user = decodedToken;
    req.botActor = 'admin_user';
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || ''
    );
    req.dbUserId = dbUser.id;
    return next();
  } catch (error) {
    if (error instanceof DatabaseOperationError) {
      return res.status(503).json({ error: error.message });
    }
    return res.status(401).json({
      error: 'Fiyat botu yetkilendirmesi doğrulanamadı.',
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || ''
    );
    req.dbUserId = dbUser.id;
  } catch (error) {
    if (error instanceof DatabaseOperationError) {
      return res.status(503).json({ error: error.message });
    }
    // Public katalog isteklerinde geçersiz token sessizce misafir olarak işlenir
  }
  next();
};
