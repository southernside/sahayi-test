-- ============================================================
-- SAHAYI CIVIC PLATFORM - DATABASE SCHEMA
-- Migration: 001_initial_schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ─── PANCHAYATS ──────────────────────────────────────────────────────────────

CREATE TABLE panchayats (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  district   TEXT NOT NULL,
  state      TEXT NOT NULL DEFAULT 'Kerala',
  geom       GEOMETRY(POLYGON, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_panchayats_geom ON panchayats USING GIST(geom);
CREATE INDEX idx_panchayats_district ON panchayats(district);

-- ─── DEPARTMENTS ─────────────────────────────────────────────────────────────

CREATE TABLE departments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  category     TEXT NOT NULL, -- maps to ComplaintCategory
  panchayat_id UUID REFERENCES panchayats(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USERS ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE NOT NULL,
  role         TEXT NOT NULL DEFAULT 'citizen'
                 CHECK (role IN ('citizen', 'admin', 'officer', 'dept_head')),
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  avatar_url   TEXT,
  panchayat_id UUID REFERENCES panchayats(id),
  dept_id      UUID REFERENCES departments(id),
  fcm_token    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_panchayat ON users(panchayat_id);

-- ─── COMPLAINTS ──────────────────────────────────────────────────────────────

CREATE TABLE complaints (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_number TEXT UNIQUE,
  citizen_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category         TEXT NOT NULL
                     CHECK (category IN ('ROAD', 'WATER', 'ELECTRICITY', 'STREET_LIGHT')),
  description      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN (
                       'DRAFT', 'SUBMITTED', 'PENDING', 'ASSIGNED',
                       'ESCALATED', 'MORE_INFO_REQUIRED', 'UNDER_VERIFICATION',
                       'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'REJECTED', 'CLOSED'
                     )),
  latitude         DOUBLE PRECISION NOT NULL,
  longitude        DOUBLE PRECISION NOT NULL,
  location         GEOMETRY(POINT, 4326) GENERATED ALWAYS AS
                     (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
  address          TEXT,
  panchayat_id     UUID REFERENCES panchayats(id),
  dept_id          UUID REFERENCES departments(id),
  officer_id       UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaints_citizen       ON complaints(citizen_id);
CREATE INDEX idx_complaints_status        ON complaints(status);
CREATE INDEX idx_complaints_category      ON complaints(category);
CREATE INDEX idx_complaints_panchayat     ON complaints(panchayat_id);
CREATE INDEX idx_complaints_created       ON complaints(created_at DESC);
CREATE INDEX idx_complaints_location      ON complaints USING GIST(location);
CREATE INDEX idx_complaints_number        ON complaints(complaint_number);

-- ─── EVIDENCE FILES ──────────────────────────────────────────────────────────

CREATE TABLE evidence_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id  UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  uploader_id   UUID NOT NULL REFERENCES users(id),
  uploader_role TEXT NOT NULL CHECK (uploader_role IN ('citizen', 'admin', 'officer')),
  storage_url   TEXT NOT NULL,
  signed_url    TEXT,
  file_type     TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_complaint ON evidence_files(complaint_id);

-- ─── STATUS LOGS ─────────────────────────────────────────────────────────────

CREATE TABLE status_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id    UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  from_status     TEXT,
  to_status       TEXT NOT NULL,
  changed_by_id   UUID NOT NULL REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_logs_complaint ON status_logs(complaint_id);
CREATE INDEX idx_status_logs_created   ON status_logs(created_at DESC);

-- ─── FEEDBACK ────────────────────────────────────────────────────────────────

CREATE TABLE feedback (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID UNIQUE NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  citizen_id   UUID NOT NULL REFERENCES users(id),
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_read      ON notifications(recipient_id, read);
CREATE INDEX idx_notifications_created   ON notifications(created_at DESC);

-- ─── ALERTS ──────────────────────────────────────────────────────────────────

CREATE TABLE alerts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panchayat_id UUID REFERENCES panchayats(id),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  published_by UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints  ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE panchayats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts      ENABLE ROW LEVEL SECURITY;

-- NOTE: Backend API uses service_role key which bypasses RLS.
-- The following policies protect direct Supabase client access (anon key).

-- Panchayats: publicly readable
CREATE POLICY "panchayats_public_read" ON panchayats
  FOR SELECT USING (TRUE);

-- Users: can read/update own record only
CREATE POLICY "users_own_read" ON users
  FOR SELECT USING (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "users_own_update" ON users
  FOR UPDATE USING (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- Complaints: citizens can CRUD their own
CREATE POLICY "complaints_citizen_select" ON complaints
  FOR SELECT USING (
    citizen_id = (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Evidence: owner can select
CREATE POLICY "evidence_owner_select" ON evidence_files
  FOR SELECT USING (
    complaint_id IN (
      SELECT id FROM complaints WHERE citizen_id = (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

-- Notifications: recipient only
CREATE POLICY "notifications_recipient_select" ON notifications
  FOR SELECT USING (
    recipient_id = (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Feedback: own feedback only
CREATE POLICY "feedback_citizen_select" ON feedback
  FOR SELECT USING (
    citizen_id = (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Alerts: publicly readable to authenticated users
CREATE POLICY "alerts_authenticated_read" ON alerts
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── SEED: KERALA PANCHAYATS (sample) ────────────────────────────────────────

INSERT INTO panchayats (name, district, state) VALUES
  ('Thiruvananthapuram Municipal Corporation', 'Thiruvananthapuram', 'Kerala'),
  ('Kollam Municipal Corporation', 'Kollam', 'Kerala'),
  ('Kochi Municipal Corporation', 'Ernakulam', 'Kerala'),
  ('Thrissur Municipal Corporation', 'Thrissur', 'Kerala'),
  ('Kozhikode Municipal Corporation', 'Kozhikode', 'Kerala'),
  ('Varkala Municipality', 'Thiruvananthapuram', 'Kerala'),
  ('Nedumangad Municipality', 'Thiruvananthapuram', 'Kerala');

-- ─── SEED: DEPARTMENTS ───────────────────────────────────────────────────────

INSERT INTO departments (name, category) VALUES
  ('Roads & Infrastructure Department',    'ROAD'),
  ('Water Supply & Sanitation Board',      'WATER'),
  ('Kerala State Electricity Board (KSEB)','ELECTRICITY'),
  ('Street Lighting Division',             'STREET_LIGHT');
