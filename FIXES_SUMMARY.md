# Fixes Summary

## Issues Fixed

### 1. Duplicate Key Constraint on candidate_profiles
**Problem:** `duplicate key value violates unique constraint "candidate_profiles_user_id_key"`

**Fix:** Updated the profile upsert in `frontend/portal/server.ts` to specify the conflict target:
```typescript
.upsert(updateData, { onConflict: 'user_id' })
```

### 2. Recruiter Can't Find Resume
**Problem:** Recruiters couldn't access candidate resumes from the applications page.

**Fixes:**
- Portal server now joins `users` table in applications GET to fetch candidate details (name, email, phone)
- Applications.tsx now displays:
  - Real candidate name (from users table)
  - Candidate email and phone
  - AI match score with color-coded badge (green ≥80%, yellow ≥60%, red <60%)
  - Functional "View Resume" button when `resume_url` is present
- Added `ai_score` field to applications table and submission flow

### 3. Candidate Applications Page Issues
**Problem:** 
- "My Applications" tab wasn't working
- Couldn't see total applications applied
- Applications didn't show job titles/company names

**Fixes:**
- Created new `/applications` page (`frontend/candidatePages/src/app/applications/page.tsx`)
- Updated dashboard navigation to link to `/applications`
- Fixed portal server to flatten job data in applications/me response
- Applications now show:
  - Job title and company name
  - Application status with color-coded badges
  - Timeline of status changes
  - Links to portfolio and resume
  - Applied date

### 4. Dashboard Stats and AI Matches
**Problem:** Dashboard showed "2 tracked applications and 0 AI matches" but matches weren't displaying properly.

**Context:** The dashboard already loads matches via `api.matches.list()`. The AI matches are computed via the `/matches/compute` endpoint which requires:
1. A resume to be uploaded (gets `resume_id`)
2. Calling the compute endpoint with that `resume_id`

The Smart Match page (`/smart-match`) handles this flow. The dashboard displays matches that have been computed.

## Additional Improvements

### Resume Upload Flow
1. **Registration:** Now includes a mandatory resume upload step after account creation
   - Parses resume automatically
   - Auto-fills profile with extracted data (skills, headline, location, education)
   - Can be skipped but encouraged

2. **Apply Page:** Enhanced with:
   - Auto-loads candidate profile and displays their info
   - Resume file upload button (PDF/DOCX)
   - Pre-fills portfolio URL from profile
   - Shows "Resume on file" if candidate has uploaded before
   - Submits `resume_id` with application

3. **Profile Storage:** Resume ID is now saved to candidate profile after upload

### Bookmarks Fix
**Problem:** "Insufficient permissions" error when bookmarking jobs.

**Fix:** Fixed route ordering bug - `/jobs/bookmarked` was registered after `/jobs/:id`, causing Express to treat "bookmarked" as a job ID. Now registered before the `:id` route in both servers.

## Database Changes

### Schema Updates
Added to `database/schema.sql`:
```sql
ALTER TABLE applications ADD COLUMN ai_score NUMERIC(5,2);
```

### Migration
Run `database/add_ai_score_migration.sql` on existing databases:
```sql
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,2);
```

## Files Modified

### Backend
- `frontend/portal/server.ts`
  - Fixed profile upsert with `onConflict`
  - Added `ai_score` to application insert
  - Joined `users` table in applications GET for recruiter view
  - Flattened job data in applications/me response
  - Fixed route ordering for bookmarks
  
- `frontend/candidatePages/server.ts`
  - Added fire-and-forget profile update after resume upload
  - Fixed route ordering for bookmarks

### Frontend - Candidate Pages
- `frontend/candidatePages/src/app/register/page.tsx` - Added resume upload step
- `frontend/candidatePages/src/app/apply/page.tsx` - Enhanced with profile loading and resume upload
- `frontend/candidatePages/src/app/applications/page.tsx` - NEW: Full applications list page
- `frontend/candidatePages/src/app/dashboard/candidate/page.tsx` - Updated navigation links

### Frontend - Portal (Recruiter)
- `frontend/portal/src/pages/Applications.tsx` - Shows candidate name, email, phone, AI score

### Database
- `database/schema.sql` - Added `ai_score` column
- `database/add_ai_score_migration.sql` - NEW: Migration script

## Testing Checklist

### Candidate Flow
- [ ] Register new account → prompted for resume upload
- [ ] Upload resume → profile auto-filled with skills/education
- [ ] Apply to job → see profile info pre-filled, can upload resume
- [ ] View "My Applications" → see all applications with job titles
- [ ] Dashboard → see application count and AI matches (after computing)
- [ ] Bookmark jobs → no permission errors

### Recruiter Flow
- [ ] View Applications page → see candidate names, emails, phones
- [ ] See AI scores on applications (color-coded badges)
- [ ] Click "View Resume" → opens resume URL
- [ ] Update application status → works correctly

### Database
- [ ] Run migration on existing database
- [ ] Verify `ai_score` column exists in applications table
- [ ] Verify profile upserts don't cause duplicate key errors

## Known Limitations

1. **AI Matches:** Require explicit computation via Smart Match page. The dashboard displays computed matches but doesn't auto-compute them.

2. **Resume Viewing:** Currently opens external `resume_url` links. For parsed resumes (`resume_id`), could add a dedicated resume viewer page in future.

3. **Interviews:** The "Upcoming Interviews" section on dashboard is placeholder - interview scheduling needs to be implemented separately.

## Next Steps (Optional Enhancements)

1. Add resume viewer page for parsed resumes (using `resume_id`)
2. Auto-compute AI matches after resume upload
3. Implement interview scheduling UI
4. Add email notifications for application status changes
5. Add candidate profile page for recruiters to view full details
