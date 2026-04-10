// ============================================================
// PORTAL TYPES - Re-exports from unified types
// All portals share the same type definitions
// ============================================================

export type {
  // Enums
  UserRole,
  UserStatus,
  JobStatus,
  ApplicationStatus,
  MatchRecommendation,
  InterviewType,
  InterviewStatus,
  ResumeCandidateType,
  ProgramEnrollmentStatus,
  ProgramApplicationStatus,

  // User & Auth
  User,
  AuthTokens,
  AuthResponse,
  LoginRequest,
  RegisterRequest,

  // Candidate Profile
  CandidateProfile,
  EducationEntry,
  WorkPreferences,

  // Jobs
  Job,
  CreateJobRequest,
  UpdateJobRequest,
  JobListResponse,

  // Applications
  Application,
  ScreeningAnswer,
  TimelineEntry,
  CreateApplicationRequest,
  ApplicationListResponse,

  // Matches
  MatchResult,
  MatchBreakdown,
  MatchInsights,

  // Resume
  ResumeUploadResponse,
  ParseResult,
  NormalizedResume,
  EmploymentRecord,
  EducationRecord,
  ProjectRecord,
  CertificationRecord,
  ResumeQuality,

  // Bookmarks
  Bookmark,
  BookmarkListResponse,

  // Interviews
  Interview,
  CreateInterviewRequest,
  UpdateInterviewRequest,

  // Knowledge Factory
  Program,
  ProgramApplication,
  CreateProgramApplicationRequest,

  // API
  ApiError,
  ApiErrorResponse,
  SuccessResponse,
  ActivityLog,

  // Helpers
  formatApplicationStatus,
  getMatchScoreColor,
  getMatchScoreBg,
  formatSalary,
} from './unified';

// Legacy type aliases for backward compatibility during migration
export type LegacyJobStatus = 'Active' | 'Draft' | 'Closed';
export type LegacyApplicationStatus = 'Pending' | 'Shortlisted' | 'Rejected';
export type LegacyUserRole = 'admin' | 'recruiter';
export type LegacyUserStatus = 'Active' | 'Disabled' | 'Inactive';
