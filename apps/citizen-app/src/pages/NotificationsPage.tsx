import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, useMarkAllRead, useMarkNotificationsRead } from '@/hooks/useNotifications';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Notification, NotificationType } from '@sahayi/types';

const NOTIF_ICONS: Record<NotificationType, string> = {
  COMPLAINT_SUBMITTED:  '📋',
  COMPLAINT_ASSIGNED:   '👤',
  COMPLAINT_ESCALATED:  '⬆️',
  MORE_INFO_REQUIRED:   '❗',
  WORK_STARTED:         '🔧',
  COMPLAINT_RESOLVED:   '✅',
  COMPLAINT_REJECTED:   '❌',
  COMPLAINT_REOPENED:   '🔄',
  PUBLIC_ALERT:         '📢',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const markRead = useMarkNotificationsRead();

  const notifications = data?.data ?? [];
  const unreadCount = data?.meta?.unread_count ?? 0;

  function handleNotifClick(notif: Notification) {
    if (!notif.read) markRead.mutate([notif.id]);
    if (notif.complaint_id) navigate(`/complaints/${notif.complaint_id}`);
  }

  return (
    <div className="page-content">
      <div className="flex items-center justify-between mb-4 pt-2">
        <div>
          <h1 className="font-display text-2xl text-slate-900">Notifications</h1>
          {unreadCount > 0 && <p className="text-xs text-slate-400">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:text-primary-700"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="card flex gap-3">
              <div className="skeleton w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1">
                <div className="skeleton h-3 w-3/4 mb-2" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications yet"
          description="You'll be notified when your complaints are updated."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleNotifClick(notif)}
              className={`card w-full text-left flex items-start gap-3 transition-all hover:shadow-card-hover
                ${!notif.read ? 'bg-primary-50/60 border-primary-100' : ''}`}
            >
              {/* Unread dot */}
              {!notif.read && (
                <div className="absolute top-4 left-4 w-2 h-2 bg-primary-500 rounded-full" />
              )}

              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg
                ${!notif.read ? 'bg-primary-100' : 'bg-slate-100'}`}>
                {NOTIF_ICONS[notif.type] ?? '📬'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-snug ${!notif.read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                    {notif.title}
                  </p>
                  {notif.complaint_id && (
                    <ExternalLink size={13} className="text-slate-400 shrink-0 mt-0.5" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
