import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { supabase } from '../lib/supabase';

export const alertsRouter = Router();
alertsRouter.use(authMiddleware);

alertsRouter.get('/', async (req, res, next) => {
  try {
    const user = req.user!;

    let query = supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (user.panchayat_id) {
      query = query.or(`panchayat_id.eq.${user.panchayat_id},panchayat_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
});
