import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { UpdateUserProfileSchema } from '@sahayi/schemas';
import { logger } from '../utils/logger';

export const authRouter = Router();

/**
 * POST /api/v1/auth/login
 * Verifies Firebase token and upserts user record.
 * Returns the user profile.
 */
authRouter.post('/login', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user!;

    // Update FCM token if provided
    const { fcm_token } = req.body;
    if (fcm_token) {
      await supabase
        .from('users')
        .update({ fcm_token, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    logger.info('User login', { user_id: user.id, role: user.role });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url,
          panchayat: user.panchayat,
          created_at: user.created_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/auth/me
 * Returns the current authenticated user's profile.
 */
authRouter.get('/me', authMiddleware, async (req, res) => {
  const user = req.user!;
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        panchayat: user.panchayat,
        created_at: user.created_at,
      },
    },
  });
});

/**
 * PATCH /api/v1/auth/profile
 * Update user profile fields (name, phone, FCM token).
 */
authRouter.patch('/profile', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user!;
    const updates = UpdateUserProfileSchema.parse(req.body);

    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: { user: data } });
  } catch (error) {
    next(error);
  }
});
