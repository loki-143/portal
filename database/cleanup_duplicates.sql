-- ============================================================
-- CLEANUP DUPLICATE USERS
-- Run this in Supabase SQL Editor to fix duplicate key errors
-- ============================================================

-- Step 1: Find duplicates (for verification)
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicate users, keeping only the most recent one
DELETE FROM users
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC, id DESC) as rn
    FROM users
  ) t 
  WHERE rn > 1
);

-- Step 3: Verify no duplicates remain
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Step 4: If you see any orphaned candidate_profiles, clean them up
DELETE FROM candidate_profiles
WHERE user_id NOT IN (SELECT id FROM users);

-- Step 5: Verify the cleanup
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(DISTINCT email) FROM users) as unique_emails,
  (SELECT COUNT(*) FROM candidate_profiles) as total_profiles;
