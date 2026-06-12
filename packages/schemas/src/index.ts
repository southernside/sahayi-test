import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ComplaintCategory = z.enum(['ROAD', 'WATER', 'ELECTRICITY', 'STREET_LIGHT']);
export type ComplaintCategory = z.infer<typeof ComplaintCategory>;

export const ComplaintStatus = z.enum([
  'DRAFT',
  'SUBMITTED',
  'PENDING',
  'ASSIGNED',
  'ESCALATED',
  'MORE_INFO_REQUIRED',
  'UNDER_VERIFICATION',
  'IN_PROGRESS',
  'RESOLVED',
  'REOPENED',
  'REJECTED',
  'CLOSED',
]);
export type ComplaintStatus = z.infer<typeof ComplaintStatus>;

export const UserRole = z.enum(['citizen', 'admin', 'officer', 'dept_head']);
export type UserRole = z.infer<typeof UserRole>;

// ─── Complaint Schemas ────────────────────────────────────────────────────────

export const CreateComplaintSchema = z.object({
  category: ComplaintCategory,
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  panchayat_id: z.string().uuid().optional(),
});
export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>;

export const UpdateComplaintStatusSchema = z.object({
  status: ComplaintStatus,
  notes: z.string().max(500).optional(),
  officer_id: z.string().uuid().optional(),
});
export type UpdateComplaintStatusInput = z.infer<typeof UpdateComplaintStatusSchema>;

export const ComplaintFilterSchema = z.object({
  status: ComplaintStatus.optional(),
  category: ComplaintCategory.optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().optional(),
});
export type ComplaintFilterInput = z.infer<typeof ComplaintFilterSchema>;

// ─── Feedback Schemas ─────────────────────────────────────────────────────────

export const SubmitFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;

// ─── User Schemas ─────────────────────────────────────────────────────────────

export const UpdateUserProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/).optional(),
  fcm_token: z.string().optional(),
});
export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileSchema>;

// ─── Notification Schemas ─────────────────────────────────────────────────────

export const MarkNotificationReadSchema = z.object({
  notification_ids: z.array(z.string().uuid()).min(1),
});
export type MarkNotificationReadInput = z.infer<typeof MarkNotificationReadSchema>;
