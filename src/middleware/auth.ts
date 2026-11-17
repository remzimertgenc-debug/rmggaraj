import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { DatabaseOperationError } from '../db/index.ts';
import { getOrCreateUser } from '../db/users.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUserId?: number;
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
