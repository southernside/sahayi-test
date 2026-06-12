import { getFirebaseMessaging } from '../lib/firebase';
import { logger } from '../utils/logger';

interface SendNotificationParams {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendNotification({
  token,
  title,
  body,
  data,
}: SendNotificationParams): Promise<void> {
  try {
    const messaging = getFirebaseMessaging();
    await messaging.send({
      token,
      notification: { title, body },
      data: data || {},
      webpush: {
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
        },
        fcmOptions: {
          link: data?.complaint_id
            ? `/complaints/${data.complaint_id}`
            : '/',
        },
      },
    });
    logger.debug('Push notification sent', { title, type: data?.type });
  } catch (error: any) {
    // Non-fatal: log and continue
    logger.warn('Failed to send push notification', { error: error?.message });
  }
}
