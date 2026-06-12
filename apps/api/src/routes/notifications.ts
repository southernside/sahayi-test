import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { MarkNotificationReadSchema } from '@sahayi/schemas';

export const notificationsRouter = Router();
notificationsRouter.use(authMiddleware);

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const unreadCount = data?.filter((n) => !n.read).length || 0;

    res.json({
      success: true,
      data: data || [],
      meta: { page, limit, total: count || 0, unread_count: unreadCount },
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch('/read', async (req, res, next) => {
  try {
    const user = req.user!;
    const { notification_ids } = MarkNotificationReadSchema.parse(req.body);

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', notification_ids)
      .eq('recipient_id', user.id);

    if (error) throw error;

    res.json({ success: true, data: { message: 'Notifications marked as read' } });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch('/read-all', async (req, res, next) => {
  try {
    const user = req.user!;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', user.id)
      .eq('read', false);

    if (error) throw error;

    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (error) {
    next(error);
  }
});
