// ============================================================
// UNIFIED PLATFORM TYPES
// Source of truth for all portals - portal, candidate, admin
// ============================================================

// ============================================================
// ENUMS
// ============================================================

export type UserRole = "superadmin" | "admin" | "recruiter" | "candidate";

export type UserStatus = "active" | "disabled" | "inactive";

export type JobStatus = "draft" | "active" | "closed";

export type ApplicationStatus =
  | "Applied"
  | "Under Review"
  | "Shortlisted"
  | "Interview Scheduled"
  | "Interview Completed"
  | "Offered"
  | "Hired"
  | "Rejected"
  | "Withdrawn";

export enum MatchRecommendation {
  SHORTLIST = "SHORTLIST",
  REVIEW = "REVIEW",
  REJECT = "REJECT",
}

export type InterviewType = "phone" | "video" | "onsite";

export type InterviewStatus = "scheduled" | "completed" | "cancelled";

export type ResumeCandidateType = "fresher" | "lateral";

export type ProgramEnrollmentStatus = "open" | "closed" | "full";

export type ProgramApplicationStatus = "Submitted" | "Under Review" | "Accepted" | "Rejected";

// ============================================================
// USER & AUTH
// ============================================================

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: UserRole;
}

// ============================================================
// CANDIDATE PROFILE
// ============================================================

export interface CandidateProfile {
  id: string;
  user_id: string;
  resume_id: string | null;
  headline: string | null;
  location: string | null;
  bio: string | null;
  skills: string[];
  experience_years: number;
  education: EducationEntry[];
  work_preferences: WorkPreferences;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  gpa?: string;
}

export interface WorkPreferences {
  desired_role?: string;
  preferred_locations?: string[];
  salary_min?: number;
  salary_max?: number;
  remote_ok?: boolean;
  job_types?: string[];
}

// ============================================================
// JOBS
// ============================================================

export interface Job {
  id: string;
  title: string;
  company_name: string | null;
  department: string | null;
  location: string | null;
  type: string | null;
  description: string | null;
  required_skills: string[];
  preferred_skills: string[];
  experience_min_years: number | null;
  experience_max_years: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string;
  status: JobStatus;
  posted_by: string | null;
  posted_at: string;
  updated_at: string;
  match_score?: number; // Computed field for candidate views
}

export interface CreateJobRequest {
  title: string;
  company_name?: string;
  department?: string;
  location?: string;
  type?: string;
  description?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  experience_min_years?: number;
  experience_max_years?: number;
  salary_min?: number;
  salary_max?: number;
  salary_period?: string;
  status?: JobStatus;
}

export interface UpdateJobRequest {
  title?: string;
  company_name?: string;
  department?: string;
  location?: string;
  type?: string;
  description?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  experience_min_years?: number;
  experience_max_years?: number;
  salary_min?: number;
  salary_max?: number;
  salary_period?: string;
  status?: JobStatus;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// APPLICATIONS
// ============================================================

export interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  resume_id: string | null;
  cover_letter: string | null;
  portfolio_url: string | null;
  resume_url: string | null;
  screening_answers: ScreeningAnswer[];
  status: ApplicationStatus;
  timeline: TimelineEntry[];
  applied_at: string;
  updated_at: string;
  jobs?: Job;
  candidate_profiles?: CandidateProfile;
}

export interface ScreeningAnswer {
  question: string;
  answer: string;
}

export interface TimelineEntry {
  status: ApplicationStatus;
  changed_at: string;
  note?: string;
}

export interface CreateApplicationRequest {
  job_id: string;
  cover_letter?: string;
  portfolio_url?: string;
  resume_url?: string;
  screening_answers?: ScreeningAnswer[];
}

export interface ApplicationListResponse {
  applications: Application[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// MATCHES
// ============================================================

export interface MatchResult {
  id: string;
  candidateName: string;
  resume_id: string;
  jobId: string;
  jobTitle: string;
  jd_match_score: number;
  resume_quality_score: number;
  breakdown: MatchBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  recommendation: MatchRecommendation;
  summary?: string;
  company_name?: string;
  location?: string;
  job_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_period?: string;
  posted_at?: string;
}

export interface MatchBreakdown {
  jd_match: Record<string, number>;
  resume_quality: Record<string, number>;
}

export interface MatchInsights {
  average_score: number;
  top_matched_job: string | null;
  total_matches: number;
}

// ============================================================
// RESUME
// ============================================================

export interface ResumeUploadResponse {
  upload_id: string;
  resume_id: string;
  status: string;
  parse_result: ParseResult;
}

export interface ParseResult {
  upload_id: string;
  resume_id: string;
  status: string;
  candidate_name: string;
  extracted_skills: string[];
  summary: string;
  raw: {
    source: string;
    parse_response?: unknown;
  };
  candidate_type: ResumeCandidateType | null;
  normalized_resume: NormalizedResume;
  warnings: string[];
  missing_fields: string[];
  resume_quality: ResumeQuality;
  parser_metadata: unknown;
}

export interface NormalizedResume {
  full_name: string | null;
  emails: string[];
  phones: string[];
  current_location: string | null;
  links: string[];
  skills: string[];
  skill_evidence: string[];
  experience_summary: string | null;
  employment_history: EmploymentRecord[];
  education: EducationRecord[];
  projects: ProjectRecord[];
  certifications: CertificationRecord[];
  current_role: string | null;
  full_time_months: number;
  internship_months: number;
  total_relevant_months: number;
  notice_period: string | null;
  current_ctc: string | null;
  expected_ctc: string | null;
  preferred_location: string | null;
  work_authorization: string | null;
}

export interface EmploymentRecord {
  employer: string | null;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  duration_months: number | null;
}

export interface EducationRecord {
  institution: string | null;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  gpa: string | null;
}

export interface ProjectRecord {
  name: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  technologies: string[];
}

export interface CertificationRecord {
  name: string | null;
  issuer: string | null;
  date: string | null;
  expiry_date: string | null;
}

export interface ResumeQuality {
  score: number;
  breakdown: Record<string, number>;
  recommendation: string;
  summary: string;
}

// ============================================================
// BOOKMARKS
// ============================================================

export interface Bookmark {
  id: string;
  candidate_id: string;
  job_id: string;
  created_at: string;
  jobs?: Job;
}

export interface BookmarkListResponse {
  bookmarks: Bookmark[];
}

// ============================================================
// INTERVIEWS
// ============================================================

export interface Interview {
  id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;
  scheduled_at: string;
  interview_type: InterviewType;
  meeting_link: string | null;
  interviewer_name: string | null;
  notes_for_candidate: string | null;
  status: InterviewStatus;
  feedback: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
  applications?: {
    job_id: string;
    status: ApplicationStatus;
  };
}

export interface CreateInterviewRequest {
  application_id: string;
  scheduled_at: string;
  interview_type: InterviewType;
  meeting_link?: string;
  interviewer_name?: string;
  notes_for_candidate?: string;
}

export interface UpdateInterviewRequest {
  scheduled_at?: string;
  interview_type?: InterviewType;
  meeting_link?: string;
  interviewer_name?: string;
  notes_for_candidate?: string;
  status?: InterviewStatus;
  feedback?: string;
  rating?: number;
}

// ============================================================
// KNOWLEDGE FACTORY PROGRAMS
// ============================================================

export interface Program {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration: string | null;
  enrollment_status: ProgramEnrollmentStatus;
  prerequisites: string[];
  created_by: string | null;
  created_at: string;
}

export interface ProgramApplication {
  id: string;
  candidate_id: string;
  program_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  university: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  statement_of_purpose: string | null;
  status: ProgramApplicationStatus;
  submitted_at: string;
}

export interface CreateProgramApplicationRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  university: string;
  linkedin_url?: string;
  resume_url?: string;
  statement_of_purpose: string;
}

// ============================================================
// API RESPONSE WRAPPERS
// ============================================================

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface SuccessResponse {
  success: boolean;
}

// ============================================================
// ACTIVITY LOG
// ============================================================

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: unknown;
  created_at: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function formatApplicationStatus(status: ApplicationStatus): string {
  const statusMap: Record<ApplicationStatus, string> = {
    "Applied": "Applied",
    "Under Review": "Under Review",
    "Shortlisted": "Shortlisted",
    "Interview Scheduled": "Interview Scheduled",
    "Interview Completed": "Interview Completed",
    "Offered": "Offered",
    "Hired": "Hired",
    "Rejected": "Rejected",
    "Withdrawn": "Withdrawn",
  };
  return statusMap[status] || status;
}

export function getMatchScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

export function getMatchScoreBg(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return "Not specified";
  const formatNum = (n: number) => `₹${(n / 100000).toFixed(1)}L`;
  if (min && max) return `${formatNum(min)} - ${formatNum(max)}`;
  if (min) return `From ${formatNum(min)}`;
  if (max) return `Up to ${formatNum(max)}`;
  return "Not specified";
}
