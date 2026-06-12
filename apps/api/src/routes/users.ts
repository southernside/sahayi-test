import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { supabase } from '../lib/supabase';

export const usersRouter = Router();
usersRouter.use(authMiddleware);

usersRouter.get('/me', async (req, res, next) => {
  try {
    const user = req.user!;
    const { data, error } = await supabase
      .from('users')
      .select('*, panchayat:panchayats(id, name, district, state)')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    // Strip FCM token from response — never return to client
    const { fcm_token: _, ...safeUser } = data;
    res.json({ success: true, data: safeUser });
  } catch (error) {
    next(error);
  }
});

usersRouter.get('/stats', async (req, res, next) => {
  try {
    const user = req.user!;
    const { data, error } = await supabase
      .from('complaints')
      .select('status')
      .eq('citizen_id', user.id)
      .neq('status', 'DRAFT');

    if (error) throw error;

    const stats = {
      total: data.length,
      pending: data.filter((c) => ['SUBMITTED', 'PENDING', 'ASSIGNED'].includes(c.status)).length,
      in_progress: data.filter((c) =>
        ['UNDER_VERIFICATION', 'IN_PROGRESS'].includes(c.status),
      ).length,
      resolved: data.filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status)).length,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});
