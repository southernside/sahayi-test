import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../src/lib/firebase', () => ({
  getFirebaseAuth: () => ({
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: 'test-firebase-uid',
      email: 'test@example.com',
      name: 'Test Citizen',
    }),
  }),
  getFirebaseMessaging: () => ({
    send: vi.fn().mockResolvedValue('message-id'),
  }),
  getFirebaseAdmin: () => ({}),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' } }),
    },
  },
}));

vi.mock('../src/services/notificationService', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/services/geocodingService', () => ({
  geocodeLocation: vi.fn().mockResolvedValue({
    formatted_address: '123 Test Road, Thiruvananthapuram',
    panchayat_id: 'test-panchayat-id',
  }),
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'test-user-id',
  firebase_uid: 'test-firebase-uid',
  role: 'citizen',
  name: 'Test Citizen',
  email: 'test@example.com',
  panchayat_id: 'test-panchayat-id',
  fcm_token: 'test-fcm-token',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_COMPLAINT = {
  id: 'test-complaint-id',
  complaint_number: 'SAH-20250609-ABCDE',
  citizen_id: 'test-user-id',
  category: 'ROAD',
  description: 'Large pothole causing accidents near the school',
  status: 'SUBMITTED',
  latitude: 8.5241,
  longitude: 76.9366,
  address: '123 Test Road, Thiruvananthapuram',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── Complaint Number Generator Tests ────────────────────────────────────────

describe('generateComplaintNumber', () => {
  it('generates a complaint number with correct format', async () => {
    const { generateComplaintNumber } = await import('../src/utils/complaintNumber');
    const number = generateComplaintNumber();
    expect(number).toMatch(/^SAH-\d{8}-[A-Z0-9]{5}$/);
  });

  it('generates unique numbers on consecutive calls', async () => {
    const { generateComplaintNumber } = await import('../src/utils/complaintNumber');
    const numbers = new Set(Array.from({ length: 100 }, () => generateComplaintNumber()));
    // Very high probability of uniqueness
    expect(numbers.size).toBeGreaterThan(95);
  });
});

// ─── Complaint Schema Validation Tests ────────────────────────────────────────

describe('CreateComplaintSchema validation', () => {
  it('validates valid complaint input', async () => {
    const { CreateComplaintSchema } = await import('../../packages/schemas/src');
    const result = CreateComplaintSchema.safeParse({
      category: 'ROAD',
      description: 'Large pothole near the school causing accidents',
      latitude: 8.5241,
      longitude: 76.9366,
    });
    expect(result.success).toBe(true);
  });

  it('rejects description shorter than 10 chars', async () => {
    const { CreateComplaintSchema } = await import('../../packages/schemas/src');
    const result = CreateComplaintSchema.safeParse({
      category: 'ROAD',
      description: 'Short',
      latitude: 8.5241,
      longitude: 76.9366,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', async () => {
    const { CreateComplaintSchema } = await import('../../packages/schemas/src');
    const result = CreateComplaintSchema.safeParse({
      category: 'INVALID_CATEGORY',
      description: 'Valid description that is long enough',
      latitude: 8.5241,
      longitude: 76.9366,
    });
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range coordinates', async () => {
    const { CreateComplaintSchema } = await import('../../packages/schemas/src');
    const result = CreateComplaintSchema.safeParse({
      category: 'WATER',
      description: 'Valid description that is long enough to pass',
      latitude: 200, // invalid
      longitude: 76.9366,
    });
    expect(result.success).toBe(false);
  });
});

// ─── Feedback Schema Tests ────────────────────────────────────────────────────

describe('SubmitFeedbackSchema validation', () => {
  it('accepts rating 1-5', async () => {
    const { SubmitFeedbackSchema } = await import('../../packages/schemas/src');
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(SubmitFeedbackSchema.safeParse({ rating }).success).toBe(true);
    }
  });

  it('rejects rating 0 or 6', async () => {
    const { SubmitFeedbackSchema } = await import('../../packages/schemas/src');
    expect(SubmitFeedbackSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(SubmitFeedbackSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it('accepts optional comment', async () => {
    const { SubmitFeedbackSchema } = await import('../../packages/schemas/src');
    const result = SubmitFeedbackSchema.safeParse({ rating: 4, comment: 'Great service!' });
    expect(result.success).toBe(true);
  });
});

// ─── Filter Schema Tests ──────────────────────────────────────────────────────

describe('ComplaintFilterSchema', () => {
  it('defaults page to 1 and limit to 10', async () => {
    const { ComplaintFilterSchema } = await import('../../packages/schemas/src');
    const result = ComplaintFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('coerces string page and limit', async () => {
    const { ComplaintFilterSchema } = await import('../../packages/schemas/src');
    const result = ComplaintFilterSchema.parse({ page: '3', limit: '20' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
  });

  it('clamps limit to max 50', async () => {
    const { ComplaintFilterSchema } = await import('../../packages/schemas/src');
    const result = ComplaintFilterSchema.safeParse({ limit: '100' });
    expect(result.success).toBe(false);
  });
});
