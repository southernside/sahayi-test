import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Complaint,
  ApiResponse,
  ComplaintStatus,
  ComplaintCategory,
} from '@sahayi/types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const complaintKeys = {
  all: ['complaints'] as const,
  lists: () => [...complaintKeys.all, 'list'] as const,
  list: (filters: object) => [...complaintKeys.lists(), filters] as const,
  detail: (id: string) => [...complaintKeys.all, 'detail', id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useComplaints(filters?: {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  page?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: complaintKeys.list(filters || {}),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.search) params.set('search', filters.search);
      const res = await api.get<ApiResponse<Complaint[]>>(`/complaints?${params}`);
      return res.data;
    },
  });
}

export function useComplaint(id: string) {
  return useQuery({
    queryKey: complaintKeys.detail(id),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Complaint>>(`/complaints/${id}`);
      return res.data.data!;
    },
    enabled: !!id,
  });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      category: ComplaintCategory;
      description: string;
      latitude: number;
      longitude: number;
      address?: string;
      is_draft?: boolean;
    }) => {
      const res = await api.post<ApiResponse<Complaint>>('/complaints', data);
      return res.data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
    },
  });
}

export function useSubmitDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<ApiResponse<Complaint>>(`/complaints/${id}/submit`);
      return res.data.data!;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(id) });
    },
  });
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, files }: { id: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      const res = await api.post(`/complaints/${id}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          // Progress can be exposed via a callback if needed
          const pct = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          console.debug('Upload progress:', pct);
        },
      });
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(id) });
    },
  });
}

export function useReopenComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await api.post<ApiResponse<Complaint>>(`/complaints/${id}/reopen`, { reason });
      return res.data.data!;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
    },
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      rating,
      comment,
    }: {
      id: string;
      rating: number;
      comment?: string;
    }) => {
      const res = await api.post(`/complaints/${id}/feedback`, { rating, comment });
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
    },
  });
}
