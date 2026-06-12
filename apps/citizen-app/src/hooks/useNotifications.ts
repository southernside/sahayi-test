import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Notification, ApiResponse } from '@sahayi/types';

export const notifKeys = {
  all: ['notifications'] as const,
  list: (page: number) => [...notifKeys.all, page] as const,
};

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: notifKeys.list(page),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Notification[]>>(`/notifications?page=${page}`);
      return res.data;
    },
    refetchInterval: 30_000, // Poll every 30s
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await api.patch('/notifications/read', { notification_ids: ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notifKeys.all });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notifKeys.all });
    },
  });
}
