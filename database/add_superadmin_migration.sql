-- Migration: Add superadmin role support
-- Run this migration to add superadmin role to existing database

-- Step 1: Add is_superadmin column
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Step 2: Update role constraint to include superadmin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'recruiter', 'candidate'));

-- Step 3: Create a function to prevent superadmin deletion/disabling
CREATE OR REPLACE FUNCTION protect_superadmin()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent deletion of superadmin
  IF TG_OP = 'DELETE' AND OLD.is_superadmin = true THEN
    RAISE EXCEPTION 'Cannot delete superadmin user';
  END IF;
  
  -- Prevent disabling superadmin
  IF TG_OP = 'UPDATE' AND OLD.is_superadmin = true THEN
    IF NEW.status != 'active' THEN
      RAISE EXCEPTION 'Cannot disable superadmin user';
    END IF;
    IF NEW.is_superadmin = false THEN
      RAISE EXCEPTION 'Cannot remove superadmin privileges';
    END IF;
    IF NEW.role != 'superadmin' THEN
      RAISE EXCEPTION 'Cannot change superadmin role';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to protect superadmin
DROP TRIGGER IF EXISTS protect_superadmin_trigger ON users;
CREATE TRIGGER protect_superadmin_trigger
  BEFORE UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION protect_superadmin();

-- Step 5: Ensure only one superadmin can exist
CREATE OR REPLACE FUNCTION ensure_single_superadmin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_superadmin = true THEN
    -- Check if another superadmin already exists
    IF EXISTS (SELECT 1 FROM users WHERE is_superadmin = true AND id != NEW.id) THEN
      RAISE EXCEPTION 'Only one superadmin can exist in the system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_superadmin_trigger ON users;
CREATE TRIGGER ensure_single_superadmin_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_superadmin();

-- Step 6: Create index for superadmin lookup
CREATE INDEX IF NOT EXISTS idx_users_is_superadmin ON users(is_superadmin) WHERE is_superadmin = true;

-- Note: To create the first superadmin, run:
-- UPDATE users SET role = 'superadmin', is_superadmin = true WHERE email = 'your-superadmin-email@example.com';
