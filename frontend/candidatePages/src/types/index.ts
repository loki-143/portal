export enum MatchRecommendation {
  SHORTLIST = "SHORTLIST",
  REVIEW = "REVIEW",
  REJECT = "REJECT",
}

export enum JobStatus {
  ACTIVE = "active",
  CLOSED = "closed",
}

export type UserRole = "candidate" | "recruiter" | "admin";
export type JobType = "Full-time" | "Contract" | "Part-time" | "Internship";
export type SalaryPeriod = "yearly" | "daily" | "hourly";
export type ApplicationStatus =
  | "Applied"
  | "Under Review"
  | "Shortlisted"
  | "Interview"
  | "Decision";
export type ProgramStatus = "Open" | "Closed" | "Upcoming";

export interface EducationEntry {
  institution: string;
  degree: string;
  field_of_study: string;
  graduation_year: number;
}

export interface WorkPreferences {
  desired_role: string;
  preferred_locations: string[];
  salary_min: number;
  salary_max: number;
  remote_ok: boolean;
  job_types: JobType[];
}

export interface CandidateProfile {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  headline: string;
  location: string;
  phone: string;
  linkedin_url?: string;
  portfolio_url?: string;
  bio: string;
  skills: string[];
  experience_years: number;
  education: EducationEntry[];
  work_preferences: WorkPreferences;
  resume_id?: string;
  avatar_url?: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: JobType;
  salary: string;
  description: string;
  icon: string;
  status: JobStatus;
  postedDate: string;
  company_name?: string;
  remote_ok?: boolean;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: SalaryPeriod;
  application_deadline?: string;
  match_score?: number;
  matched_tags?: string[];
}

export interface MatchBreakdown {
  jd_match: Record<string, number>;
  resume_quality: Record<string, number>;
}

export interface MatchResult {
  id: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  resume_id: string;
  jd_match_score: number;
  resume_quality_score: number;
  breakdown: MatchBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  recommendation: MatchRecommendation;
  summary?: string;
  company_name?: string;
  location?: string;
  job_type?: JobType;
  salary_min?: number;
  salary_max?: number;
  salary_period?: SalaryPeriod;
  posted_at?: string;
}

export interface ScreeningAnswer {
  question_id: string;
  answer: string;
}

export interface ApplicationTimelineEntry {
  status: ApplicationStatus;
  changed_at: string;
  notes?: string;
}

export interface Application {
  id: string;
  job_id: string;
  job_title?: string;
  company_name?: string;
  location?: string;
  status: ApplicationStatus;
  applied_at?: string;
  cover_letter?: string;
  resume_url: string;
  portfolio_url?: string;
  answers_to_screening_questions?: ScreeningAnswer[];
  timeline?: ApplicationTimelineEntry[];
}

export interface KnowledgeFactoryProgram {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: string;
  eligibility: string;
  deadline: string;
  status: ProgramStatus;
  start_date?: string;
  duration_weeks?: number;
  mentor_count?: number;
  spots_available?: number;
  spots_total?: number;
  tags?: string[];
}

export interface KnowledgeFactoryApplication {
  id: string;
  program_id: string;
  program_name: string;
  full_name: string;
  email: string;
  phone: string;
  university: string;
  linkedin_url?: string;
  resume_url: string;
  statement_of_purpose: string;
  status: string;
  submitted_at: string;
}

export interface MatchInsightTip {
  tip: string;
  impact: string;
  category: string;
}

export interface MatchInsights {
  skills_match_percentage: number;
  experience_match_percentage: number;
  overall_match_percentage: number;
  improvement_tips: MatchInsightTip[];
}

export type ResumeCandidateType = "fresher" | "lateral";

export interface ResumeEmploymentRecord {
  company?: string | null;
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  employment_type?: string | null;
  location?: string | null;
  description?: string | null;
  is_current?: boolean;
}

export interface ResumeEducationRecord {
  degree?: string | null;
  specialization?: string | null;
  institution?: string | null;
  completion_year?: number | null;
  score?: string | null;
}

export interface ResumeProjectRecord {
  title: string;
  tech_stack: string[];
  summary?: string | null;
  source_section: string;
}

export interface ResumeCertificationRecord {
  name: string;
  issuer?: string | null;
  issued_date?: string | null;
}

export interface ResumeSkillEvidenceRecord {
  skill: string;
  evidence_type: string;
  source_section: string;
}

export interface NormalizedResume {
  full_name?: string | null;
  emails: string[];
  phones: string[];
  current_location?: string | null;
  links: string[];
  skills: string[];
  skill_evidence: ResumeSkillEvidenceRecord[];
  experience_summary?: string | null;
  employment_history: ResumeEmploymentRecord[];
  education: ResumeEducationRecord[];
  projects: ResumeProjectRecord[];
  certifications: ResumeCertificationRecord[];
  current_role?: string | null;
  full_time_months: number;
  internship_months: number;
  total_relevant_months: number;
  notice_period?: string | null;
  current_ctc?: string | null;
  expected_ctc?: string | null;
  preferred_location?: string | null;
  work_authorization?: string | null;
}

export interface ResumeQualityResult {
  score: number;
  breakdown: Record<string, number>;
  recommendation: string;
  summary?: string | null;
}

export interface ParserMetadata {
  filename: string;
  file_type: string;
  content_type?: string | null;
  file_size_bytes: number;
  line_count: number;
  page_count: number;
  extractor_name?: string | null;
  section_order: string[];
  detected_columns: number;
  is_scanned: boolean;
  content_fingerprint?: string | null;
  sensitive_findings: string[];
  extracted_text?: string;
}

export interface ResumeParseResult {
  upload_id: string;
  resume_id: string;
  status: string;
  candidate_name: string;
  extracted_skills: string[];
  summary: string;
  raw: Record<string, unknown>;
  candidate_type?: ResumeCandidateType;
  normalized_resume?: NormalizedResume;
  warnings?: string[];
  missing_fields?: string[];
  resume_quality?: ResumeQualityResult;
  parser_metadata?: ParserMetadata;
}

export interface ResumeUploadResponse {
  upload_id: string;
  resume_id: string;
  status: string;
  parse_result?: ResumeParseResult;
}

export interface ResumeDetails {
  resume_id: string;
  candidate_type: ResumeCandidateType;
  normalized_resume: NormalizedResume;
  resume_quality: ResumeQualityResult;
  parser_metadata: ParserMetadata;
  duplicate_of_resume_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthSession extends AuthTokens {
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refresh_token: string;
}

export interface JobListParams {
  [key: string]: string | number | boolean | undefined;
  q?: string;
  location?: string;
  job_type?: JobType;
  department?: string;
  remote_only?: boolean;
  salary_min?: number;
  salary_max?: number;
  sort_by?: "relevance" | "date" | "salary";
  page?: number;
  limit?: number;
}

export interface ApplicationListParams {
  [key: string]: string | number | boolean | undefined;
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}

export interface MatchListParams {
  [key: string]: string | number | boolean | undefined;
  limit?: number;
  min_match_score?: number;
}

export interface ProgramListParams {
  [key: string]: string | number | boolean | undefined;
  category?: string;
  enrollment_status?: ProgramStatus;
  page?: number;
  limit?: number;
}

export interface ProgramApplicationPayload {
  full_name: string;
  email: string;
  phone: string;
  university: string;
  linkedin_url?: string;
  resume_url: string;
  statement_of_purpose: string;
  program_id: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}
