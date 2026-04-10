-- ============================================================
-- Unified Hiring Platform Database Schema
-- PostgreSQL / Supabase
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'recruiter', 'candidate')),
  status TEXT NOT NULL DEFAULT 'active',
  refresh_token TEXT,
  is_superadmin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  resume_id TEXT,
  headline TEXT,
  location TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_years INT DEFAULT 0,
  education JSONB DEFAULT '[]'::jsonb,
  work_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parsed_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_filename TEXT,
  file_type TEXT,
  file_size_bytes BIGINT,
  candidate_type TEXT CHECK (candidate_type IN ('fresher', 'lateral')),
  normalized_resume JSONB NOT NULL,
  resume_text TEXT,
  resume_quality JSONB,
  parser_metadata JSONB,
  warnings TEXT[] DEFAULT '{}',
  missing_fields TEXT[] DEFAULT '{}',
  content_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_name TEXT,
  department TEXT,
  location TEXT,
  type TEXT,
  description TEXT,
  required_skills TEXT[] DEFAULT '{}',
  preferred_skills TEXT[] DEFAULT '{}',
  experience_min_years INT,
  experience_max_years INT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_period TEXT DEFAULT 'yearly',
  status TEXT NOT NULL DEFAULT 'draft',
  posted_by UUID REFERENCES users(id),
  posted_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id TEXT,
  cover_letter TEXT,
  portfolio_url TEXT,
  resume_url TEXT,
  screening_answers JSONB DEFAULT '[]'::jsonb,
  ai_score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'Applied',
  timeline JSONB DEFAULT '[]'::jsonb,
  applied_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resume_id TEXT,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  jd_match_score NUMERIC(5,2),
  resume_quality_score NUMERIC(5,2),
  breakdown JSONB,
  matched_skills TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  recommendation TEXT CHECK (recommendation IN ('SHORTLIST', 'REVIEW', 'REJECT')),
  summary TEXT,
  scored_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES users(id),
  job_id UUID REFERENCES jobs(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  interview_type TEXT CHECK (interview_type IN ('phone', 'video', 'onsite')),
  meeting_link TEXT,
  interviewer_name TEXT,
  notes_for_candidate TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  feedback TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  duration TEXT,
  enrollment_status TEXT NOT NULL DEFAULT 'open',
  prerequisites TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS program_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  university TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  statement_of_purpose TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(candidate_id, program_id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_job_matches_candidate_id ON job_matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_id ON job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_job_bookmarks_candidate_id ON job_bookmarks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_program_applications_candidate_id ON program_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_program_applications_program_id ON program_applications(program_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_applications ENABLE ROW LEVEL SECURITY;

-- Everyone can read active jobs and open programs
CREATE POLICY "everyone_read_jobs" ON jobs FOR SELECT USING (status = 'active');
CREATE POLICY "everyone_read_programs" ON programs FOR SELECT USING (enrollment_status = 'open');

-- Candidates see own data only
CREATE POLICY "candidates_own_profile" ON candidate_profiles FOR ALL USING (user_id = auth.uid());
CREATE POLICY "candidates_own_resumes" ON parsed_resumes FOR ALL USING (candidate_id = auth.uid());
CREATE POLICY "candidates_own_applications" ON applications FOR ALL USING (candidate_id = auth.uid());
CREATE POLICY "candidates_own_matches" ON job_matches FOR ALL USING (candidate_id = auth.uid());
CREATE POLICY "candidates_own_bookmarks" ON job_bookmarks FOR ALL USING (candidate_id = auth.uid());
CREATE POLICY "candidates_own_interviews" ON interviews FOR ALL USING (candidate_id = auth.uid());
CREATE POLICY "candidates_own_program_apps" ON program_applications FOR ALL USING (candidate_id = auth.uid());

-- Recruiters see all jobs (for management) and all applications
CREATE POLICY "recruiters_see_jobs" ON jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'recruiter'))
);
CREATE POLICY "recruiters_manage_jobs" ON jobs FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'recruiter'))
);
CREATE POLICY "recruiters_see_applications" ON applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'recruiter'))
);
CREATE POLICY "recruiters_update_applications" ON applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'recruiter'))
);
CREATE POLICY "recruiters_see_interviews" ON interviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'recruiter'))
);
CREATE POLICY "recruiters_manage_interviews" ON interviews FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'recruiter'))
);

-- Admins see everything (handled via service role in backend)

-- ============================================================
-- TRIGGERS FOR updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_profiles_updated_at BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
