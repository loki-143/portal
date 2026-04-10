-- ============================================================
-- SEED DATA MIGRATION
-- Run this after creating tables to populate initial data
-- ============================================================

-- Seed admin user (password: admin123)
-- In production, change this password immediately
INSERT INTO users (email, password_hash, first_name, last_name, role, status)
VALUES (
  'admin@coastalseven.com',
  '$2b$12$wUheO3JgLFLF0JJMYP0Qe.fp6PDgqTVF8Oz0AnEj98fTF8XSlG2Ha',
  'Admin',
  'User',
  'admin',
  'active'
) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Seed recruiter user (password: recruiter123)
INSERT INTO users (email, password_hash, first_name, last_name, role, status)
VALUES (
  'recruiter@coastalseven.com',
  '$2b$12$e.C.ZdFjMJ5chP71iovy.O4rOlYBx24D1JbmMltp.ewUSzc0kbNXO',
  'Recruiter',
  'User',
  'recruiter',
  'active'
) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Seed sample candidate user (password: candidate123)
INSERT INTO users (email, password_hash, first_name, last_name, role, status)
VALUES (
  'candidate@example.com',
  '$2b$12$CLxT/Z9Vbs.xowrjeWl6zOGkJ5ywkMqdWhbbtb2vhSVWmB8HqCaMK',
  'Sample',
  'Candidate',
  'candidate',
  'active'
) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Seed sample jobs
INSERT INTO jobs (title, company_name, department, location, type, description, required_skills, preferred_skills, experience_min_years, experience_max_years, salary_min, salary_max, status)
VALUES
  ('Senior Software Engineer', 'Coastal Seven', 'Engineering', 'Bangalore, India', 'Full-time', 'We are looking for a Senior Software Engineer to join our team.', ARRAY['React', 'TypeScript', 'Node.js'], ARRAY['AWS', 'Docker'], 3, 8, 1500000, 2500000, 'active'),
  ('Product Manager', 'Coastal Seven', 'Product', 'Mumbai, India', 'Full-time', 'Seeking an experienced Product Manager to drive our platform strategy.', ARRAY['Product Strategy', 'Analytics'], ARRAY['B2B SaaS', 'Hiring Tech'], 4, 10, 1800000, 3000000, 'active'),
  ('Frontend Developer', 'Coastal Seven', 'Engineering', 'Remote', 'Full-time', 'Join our frontend team to build beautiful user interfaces.', ARRAY['React', 'CSS', 'TypeScript'], ARRAY['Tailwind', 'Figma'], 1, 5, 800000, 1500000, 'active'),
  ('Data Scientist', 'Coastal Seven', 'Data', 'Hyderabad, India', 'Full-time', 'Looking for a Data Scientist to work on resume parsing and matching algorithms.', ARRAY['Python', 'Machine Learning', 'NLP'], ARRAY['Resume Parsing', 'Information Extraction'], 2, 6, 1200000, 2000000, 'active'),
  ('HR Coordinator', 'Coastal Seven', 'Human Resources', 'Delhi, India', 'Full-time', 'Coordinate hiring processes and manage candidate communications.', ARRAY['Communication', 'Organization'], ARRAY['ATS Experience'], 1, 4, 500000, 900000, 'active')
ON CONFLICT DO NOTHING;

-- Seed Knowledge Factory programs
INSERT INTO programs (name, description, category, duration, enrollment_status, prerequisites)
VALUES
  ('Software Engineering Bootcamp', 'Intensive 12-week program covering full-stack development with modern technologies.', 'Engineering', '12 weeks', 'open', ARRAY['Basic programming knowledge']),
  ('Product Management Fellowship', 'Learn product strategy, user research, and feature prioritization from industry experts.', 'Product', '8 weeks', 'open', ARRAY['Analytical mindset', 'Communication skills']),
  ('Data Science Accelerator', 'Master machine learning, statistics, and data visualization in this comprehensive program.', 'Data Science', '16 weeks', 'open', ARRAY['Statistics background', 'Python basics'])
ON CONFLICT DO NOTHING;
