import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useUserStats() {
  return useQuery({
    queryKey: ['user', 'stats'],
    queryFn: async () => {
      const res = await api.get('/users/stats');
      return res.data.data as {
        total: number;
        pending: number;
        in_progress: number;
        resolved: number;
      };
    },
  });
}
