-- Migration: Add ai_score column and fix resume_id type
-- Run this if you already have an existing database

-- Add ai_score column
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,2);

-- Change resume_id from UUID to TEXT in all tables
-- (The external resume service returns string IDs, not UUIDs)

-- Step 1: Drop foreign key constraints first
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_resume_id_fkey;
ALTER TABLE job_matches DROP CONSTRAINT IF EXISTS job_matches_resume_id_fkey;

-- Step 2: Now change the column types
ALTER TABLE candidate_profiles ALTER COLUMN resume_id TYPE TEXT;
ALTER TABLE applications ALTER COLUMN resume_id TYPE TEXT;
ALTER TABLE job_matches ALTER COLUMN resume_id TYPE TEXT;
