// ─── API Response Envelope ────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  firebase_uid: string;
  role: 'citizen' | 'admin' | 'officer' | 'dept_head';
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  panchayat_id?: string;
  panchayat?: Panchayat;
  fcm_token?: string;
  created_at: string;
  updated_at: string;
}

// ─── Panchayat ────────────────────────────────────────────────────────────────

export interface Panchayat {
  id: string;
  name: string;
  district: string;
  state: string;
}

// ─── Complaint ────────────────────────────────────────────────────────────────

export type ComplaintCategory = 'ROAD' | 'WATER' | 'ELECTRICITY' | 'STREET_LIGHT';
export type ComplaintStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING'
  | 'ASSIGNED'
  | 'ESCALATED'
  | 'MORE_INFO_REQUIRED'
  | 'UNDER_VERIFICATION'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REOPENED'
  | 'REJECTED'
  | 'CLOSED';

export interface Complaint {
  id: string;
  complaint_number: string;
  citizen_id: string;
  citizen?: User;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  latitude: number;
  longitude: number;
  address?: string;
  panchayat_id?: string;
  panchayat?: Panchayat;
  dept_id?: string;
  officer_id?: string;
  rejection_reason?: string;
  evidence_files?: EvidenceFile[];
  status_logs?: StatusLog[];
  feedback?: Feedback;
  created_at: string;
  updated_at: string;
}

// ─── Evidence File ────────────────────────────────────────────────────────────

export interface EvidenceFile {
  id: string;
  complaint_id: string;
  uploader_id: string;
  uploader_role: 'citizen' | 'admin' | 'officer';
  storage_url: string;
  signed_url?: string;
  file_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

// ─── Status Log ───────────────────────────────────────────────────────────────

export interface StatusLog {
  id: string;
  complaint_id: string;
  from_status: ComplaintStatus | null;
  to_status: ComplaintStatus;
  changed_by_id: string;
  changed_by?: Partial<User>;
  notes?: string;
  created_at: string;
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export interface Feedback {
  id: string;
  complaint_id: string;
  citizen_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'COMPLAINT_SUBMITTED'
  | 'COMPLAINT_ASSIGNED'
  | 'COMPLAINT_ESCALATED'
  | 'MORE_INFO_REQUIRED'
  | 'WORK_STARTED'
  | 'COMPLAINT_RESOLVED'
  | 'COMPLAINT_REJECTED'
  | 'COMPLAINT_REOPENED'
  | 'PUBLIC_ALERT';

export interface Notification {
  id: string;
  complaint_id?: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  panchayat_id: string;
  title: string;
  body: string;
  published_by: string;
  created_at: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
}

// ─── Category UI Metadata ─────────────────────────────────────────────────────

export interface CategoryMeta {
  value: ComplaintCategory;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

// ─── Status UI Metadata ───────────────────────────────────────────────────────

export interface StatusMeta {
  value: ComplaintStatus;
  label: string;
  color: string;
  bgColor: string;
  step?: number;
}
