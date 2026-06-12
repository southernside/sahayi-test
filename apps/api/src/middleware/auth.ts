import type { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { User } from '@sahayi/types';

// Extend Express Request with auth context
declare global {
  namespace Express {
    interface Request {
      user?: User;
      firebaseUid?: string;
    }
  }
}

/**
 * Verifies Firebase ID token and attaches user to request.
 * All protected routes must use this middleware.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await getFirebaseAuth().verifyIdToken(token);

    req.firebaseUid = decoded.uid;

    // Fetch user record from DB
    const { data: user, error } = await supabase
      .from('users')
      .select('*, panchayat:panchayats(id, name, district, state)')
      .eq('firebase_uid', decoded.uid)
      .single();

    if (error || !user) {
      // Auto-create citizen on first login
      const newUser = {
        firebase_uid: decoded.uid,
        email: decoded.email || '',
        name: decoded.name || decoded.email?.split('@')[0] || 'Citizen',
        avatar_url: decoded.picture,
        role: 'citizen',
      };

      const { data: created, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select('*, panchayat:panchayats(id, name, district, state)')
        .single();

      if (createError || !created) {
        logger.error('Failed to create user record', { uid: decoded.uid, error: createError });
        res.status(500).json({ success: false, error: 'Failed to initialize user session' });
        return;
      }

      req.user = created as User;
    } else {
      req.user = user as User;
    }

    next();
  } catch (error: any) {
    if (error?.code === 'auth/id-token-expired') {
      res.status(401).json({ success: false, error: 'Token expired. Please sign in again.' });
      return;
    }
    logger.error('Auth middleware error', { error: error?.message });
    res.status(401).json({ success: false, error: 'Invalid authentication token' });
  }
}

/**
 * Role-based access control middleware.
 * Must be used after authMiddleware.
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
