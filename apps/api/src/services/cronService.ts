import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export function initCronJobs() {
  if (process.env.NODE_ENV === 'test') return;

  // ── Nightly: purge expired DRAFT complaints (>30 days old) ────────────────
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running draft cleanup job');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error, count } = await supabase
      .from('complaints')
      .delete({ count: 'exact' })
      .eq('status', 'DRAFT')
      .lt('created_at', thirtyDaysAgo);

    if (error) {
      logger.error('Draft cleanup job failed', { error });
    } else {
      logger.info(`Draft cleanup: removed ${count} expired drafts`);
    }
  });

  // ── Daily: flag complaints breaching 7-day SLA ────────────────────────────
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running SLA check job');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('complaints')
      .select('id, complaint_number, status')
      .in('status', ['PENDING', 'ASSIGNED', 'UNDER_VERIFICATION'])
      .lt('created_at', sevenDaysAgo);

    if (error) {
      logger.error('SLA check job failed', { error });
      return;
    }

    if (data && data.length > 0) {
      logger.warn(`SLA breach detected: ${data.length} complaints exceeded 7-day resolution target`, {
        complaint_ids: data.map((c) => c.id),
      });
      // In Phase 2, escalate these via BullMQ + email
    }
  });

  logger.info('Background cron jobs initialized');
}
