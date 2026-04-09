import fs from "node:fs/promises";
import path from "node:path";
import {
  parseCsv,
  parseCsvJson,
  parseCsvList,
  serializeCsv,
  stringifyCsvJson,
  stringifyCsvList,
} from "./csv-parser";
import {
  FALLBACK_APPLICATIONS,
  FALLBACK_AUTH_USER,
  FALLBACK_BOOKMARKED_JOB_IDS,
  FALLBACK_JOBS,
  FALLBACK_MATCHES,
  FALLBACK_MATCH_INSIGHTS,
  FALLBACK_PROFILE,
  FALLBACK_PROGRAM_APPLICATIONS,
  FALLBACK_PROGRAMS,
  FALLBACK_RESUME_PARSE_RESULT,
} from "./fallback-data";
import {
  MatchRecommendation,
  type Application,
  type CandidateProfile,
  type Job,
  type JobStatus,
  type JobType,
  type KnowledgeFactoryApplication,
  type KnowledgeFactoryProgram,
  type MatchBreakdown,
  type MatchInsightTip,
  type MatchInsights,
  type MatchResult,
  type ResumeParseResult,
  type SalaryPeriod,
} from "../types";

type UserRow = {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  refresh_token: string;
};

type BookmarkRecord = {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
};

type UploadRecord = {
  user_id: string;
  upload_id: string;
  resume_id: string;
  status: string;
  candidate_name: string;
  extracted_skills: string[];
  summary: string;
  raw: Record<string, unknown>;
  created_at: string;
};

const DATA_DIR = path.join(process.cwd(), "data");

const FILES = {
  jobs: path.join(DATA_DIR, "jobs.csv"),
  matches: path.join(DATA_DIR, "matches.csv"),
  programs: path.join(DATA_DIR, "programs.csv"),
  users: path.join(DATA_DIR, "users.csv"),
  profiles: path.join(DATA_DIR, "profiles.csv"),
  applications: path.join(DATA_DIR, "applications.csv"),
  bookmarks: path.join(DATA_DIR, "bookmarks.csv"),
  programApplications: path.join(DATA_DIR, "program-applications.csv"),
  uploads: path.join(DATA_DIR, "uploads.csv"),
};

const jobMetadata: Record<
  string,
  {
    company_name: string;
    matched_tags: string[];
    remote_ok: boolean;
    salary_currency: string;
    salary_period: SalaryPeriod;
  }
> = {
  job_001: {
    company_name: "Lumina Systems",
    matched_tags: ["React", "TypeScript", "Design Systems"],
    remote_ok: true,
    salary_currency: "USD",
    salary_period: "yearly",
  },
  job_002: {
    company_name: "Vortex Agency",
    matched_tags: ["Motion", "Interaction", "Brand Systems"],
    remote_ok: false,
    salary_currency: "GBP",
    salary_period: "daily",
  },
  job_003: {
    company_name: "Coastal Technologies",
    matched_tags: ["Growth", "Lifecycle", "Storytelling"],
    remote_ok: true,
    salary_currency: "USD",
    salary_period: "yearly",
  },
  job_004: {
    company_name: "Horizon Fintech",
    matched_tags: ["Leadership", "Product Strategy", "Fintech"],
    remote_ok: false,
    salary_currency: "USD",
    salary_period: "yearly",
  },
  job_005: {
    company_name: "Coastal Technologies",
    matched_tags: ["UI/UX", "AI Workflows", "Mentorship"],
    remote_ok: false,
    salary_currency: "USD",
    salary_period: "yearly",
  },
  job_006: {
    company_name: "Quantum Analytics",
    matched_tags: ["Analytics", "SQL", "Storytelling"],
    remote_ok: false,
    salary_currency: "USD",
    salary_period: "yearly",
  },
  job_007: {
    company_name: "Nexus Health",
    matched_tags: ["Research", "Testing", "Insights"],
    remote_ok: true,
    salary_currency: "USD",
    salary_period: "yearly",
  },
  job_008: {
    company_name: "Nova Atlas",
    matched_tags: ["Content", "AI Systems", "Experimentation"],
    remote_ok: false,
    salary_currency: "USD",
    salary_period: "yearly",
  },
  job_009: {
    company_name: "Spatial Works",
    matched_tags: ["Frontend", "Platform", "Performance"],
    remote_ok: false,
    salary_currency: "EUR",
    salary_period: "yearly",
  },
  job_010: {
    company_name: "Knowledge Factory",
    matched_tags: ["Partnerships", "Programs", "Operations"],
    remote_ok: false,
    salary_currency: "USD",
    salary_period: "yearly",
  },
};

const programMetadata: Record<
  string,
  Pick<
    KnowledgeFactoryProgram,
    "duration_weeks" | "start_date" | "mentor_count" | "spots_available" | "spots_total" | "tags"
  >
> = {
  prog_001: {
    duration_weeks: 12,
    start_date: "2026-06-01",
    mentor_count: 8,
    spots_available: 45,
    spots_total: 60,
    tags: ["AI/ML", "Product Strategy", "Innovation", "Leadership"],
  },
  prog_002: {
    duration_weeks: 8,
    start_date: "2026-07-15",
    mentor_count: 5,
    spots_available: 20,
    spots_total: 30,
    tags: ["Design Systems", "Figma", "Accessibility"],
  },
  prog_003: {
    duration_weeks: 6,
    start_date: "2026-08-05",
    mentor_count: 4,
    spots_available: 30,
    spots_total: 35,
    tags: ["Analytics", "Presentation", "Storytelling"],
  },
  prog_004: {
    duration_weeks: 10,
    start_date: "2026-06-20",
    mentor_count: 6,
    spots_available: 32,
    spots_total: 40,
    tags: ["AI APIs", "Evals", "Deployment"],
  },
  prog_005: {
    duration_weeks: 5,
    start_date: "2026-05-12",
    mentor_count: 3,
    spots_available: 0,
    spots_total: 25,
    tags: ["Founder", "Pitching", "Operations"],
  },
};

export async function ensureCandidateDataFiles(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  await ensureFile(
    FILES.jobs,
    ["id", "title", "department", "location", "type", "salary", "description", "icon", "status", "postedDate"],
    FALLBACK_JOBS.map((job) => ({
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      salary: job.salary,
      description: job.description,
      icon: job.icon,
      status: job.status,
      postedDate: job.postedDate,
    })),
  );

  await ensureFile(
    FILES.matches,
    [
      "id",
      "candidateName",
      "resumeId",
      "jobId",
      "jobTitle",
      "matchScore",
      "qualityScore",
      "breakdown",
      "recommendation",
      "matchedSkills",
      "missingSkills",
      "summary",
    ],
    FALLBACK_MATCHES.map((match) => ({
      id: match.id,
      candidateName: match.candidateName,
      resumeId: match.resume_id,
      jobId: match.jobId,
      jobTitle: match.jobTitle,
      matchScore: match.jd_match_score,
      qualityScore: match.resume_quality_score,
      breakdown: stringifyCsvJson(match.breakdown),
      recommendation: match.recommendation,
      matchedSkills: stringifyCsvList(match.matched_skills),
      missingSkills: stringifyCsvList(match.missing_skills),
      summary: match.summary || "",
    })),
  );

  await ensureFile(
    FILES.programs,
    ["id", "name", "category", "description", "duration", "eligibility", "deadline", "status"],
    FALLBACK_PROGRAMS.map((program) => ({
      id: program.id,
      name: program.name,
      category: program.category,
      description: program.description,
      duration: program.duration,
      eligibility: program.eligibility,
      deadline: program.deadline,
      status: program.status,
    })),
  );

  await ensureFile(
    FILES.users,
    [
      "id",
      "email",
      "password",
      "first_name",
      "last_name",
      "role",
      "phone",
      "refresh_token",
    ],
    [
      {
        id: FALLBACK_AUTH_USER.id,
        email: FALLBACK_AUTH_USER.email,
        password: FALLBACK_AUTH_USER.password,
        first_name: FALLBACK_AUTH_USER.first_name,
        last_name: FALLBACK_AUTH_USER.last_name,
        role: FALLBACK_AUTH_USER.role,
        phone: FALLBACK_AUTH_USER.phone,
        refresh_token: "",
      },
    ],
  );

  await ensureFile(
    FILES.profiles,
    [
      "user_id",
      "id",
      "email",
      "role",
      "first_name",
      "last_name",
      "headline",
      "location",
      "phone",
      "linkedin_url",
      "portfolio_url",
      "bio",
      "skills",
      "experience_years",
      "education",
      "work_preferences",
      "resume_id",
      "avatar_url",
    ],
    [profileToRow(FALLBACK_PROFILE, FALLBACK_PROFILE.id)],
  );

  await ensureFile(
    FILES.applications,
    [
      "user_id",
      "id",
      "job_id",
      "job_title",
      "company_name",
      "location",
      "status",
      "applied_at",
      "resume_url",
      "cover_letter",
      "portfolio_url",
      "answers_to_screening_questions",
      "timeline",
    ],
    FALLBACK_APPLICATIONS.map((application) =>
      applicationToRow(application, FALLBACK_PROFILE.id),
    ),
  );

  await ensureFile(
    FILES.bookmarks,
    ["id", "user_id", "job_id", "created_at"],
    FALLBACK_BOOKMARKED_JOB_IDS.map((jobId, index) => ({
      id: `bookmark_${index + 1}`,
      user_id: FALLBACK_PROFILE.id,
      job_id: jobId,
      created_at: new Date(Date.now() - index * 86_400_000).toISOString(),
    })),
  );

  await ensureFile(
    FILES.programApplications,
    [
      "id",
      "user_id",
      "program_id",
      "program_name",
      "full_name",
      "email",
      "phone",
      "university",
      "linkedin_url",
      "resume_url",
      "statement_of_purpose",
      "status",
      "submitted_at",
    ],
    FALLBACK_PROGRAM_APPLICATIONS.map((application) => ({
      ...programApplicationToRow(application, FALLBACK_PROFILE.id),
    })),
  );

  await ensureFile(
    FILES.uploads,
    [
      "user_id",
      "upload_id",
      "resume_id",
      "status",
      "candidate_name",
      "extracted_skills",
      "summary",
      "raw",
      "created_at",
    ],
    [
      {
        user_id: FALLBACK_PROFILE.id,
        upload_id: FALLBACK_RESUME_PARSE_RESULT.upload_id,
        resume_id: FALLBACK_RESUME_PARSE_RESULT.resume_id,
        status: FALLBACK_RESUME_PARSE_RESULT.status,
        candidate_name: FALLBACK_RESUME_PARSE_RESULT.candidate_name,
        extracted_skills: stringifyCsvList(
          FALLBACK_RESUME_PARSE_RESULT.extracted_skills,
        ),
        summary: FALLBACK_RESUME_PARSE_RESULT.summary,
        raw: stringifyCsvJson(FALLBACK_RESUME_PARSE_RESULT.raw),
        created_at: new Date().toISOString(),
      },
    ],
  );
}

export async function readUsers(): Promise<UserRow[]> {
  return parseCsv(await readFile(FILES.users), (row) => ({
    id: row.id,
    email: row.email,
    password: row.password,
    first_name: row.first_name,
    last_name: row.last_name,
    role: row.role,
    phone: row.phone,
    refresh_token: row.refresh_token,
  }));
}

export async function writeUsers(users: UserRow[]): Promise<void> {
  await writeFile(
    FILES.users,
    [
      "id",
      "email",
      "password",
      "first_name",
      "last_name",
      "role",
      "phone",
      "refresh_token",
    ],
    users,
  );
}

export async function readJobs(): Promise<Job[]> {
  return parseCsv(await readFile(FILES.jobs), (row) => {
    const salaryDetails = parseSalaryDetails(row.salary);
    const metadata = jobMetadata[row.id] || {
      company_name: "Coastal Seven",
      matched_tags: [],
      remote_ok: row.location.toLowerCase().includes("remote"),
      salary_currency: salaryDetails.salary_currency,
      salary_period: salaryDetails.salary_period,
    };

    return {
      id: row.id,
      title: row.title,
      department: row.department,
      location: row.location,
      type: row.type as JobType,
      salary: row.salary,
      description: row.description,
      icon: row.icon,
      status: row.status as JobStatus,
      postedDate: row.postedDate,
      company_name: metadata.company_name,
      remote_ok: metadata.remote_ok,
      salary_min: salaryDetails.salary_min,
      salary_max: salaryDetails.salary_max,
      salary_currency: metadata.salary_currency,
      salary_period: metadata.salary_period,
      matched_tags: metadata.matched_tags,
    };
  });
}

export async function readMatches(): Promise<MatchResult[]> {
  const jobs = await readJobs();
  const jobsById = new Map(jobs.map((job) => [job.id, job]));

  return parseCsv(await readFile(FILES.matches), (row) => {
    const job = jobsById.get(row.jobId);
    const jdMatch = Number(row.matchScore);
    const qualityScore = Number(row.qualityScore);
    const parsedBreakdown = parseCsvJson<MatchBreakdown | null>(
      (row.breakdown || "").trim(),
      null,
    );
    const breakdown = parsedBreakdown || buildBreakdown(jdMatch, qualityScore);

    return {
      id: row.id,
      candidateName: row.candidateName,
      resume_id: row.resumeId,
      jobId: row.jobId,
      jobTitle: row.jobTitle,
      jd_match_score: jdMatch,
      resume_quality_score: qualityScore,
      breakdown,
      matched_skills: parseCsvList(row.matchedSkills),
      missing_skills: parseCsvList(row.missingSkills),
      recommendation: row.recommendation as MatchRecommendation,
      summary: row.summary,
      company_name: job?.company_name,
      location: job?.location,
      job_type: job?.type,
      salary_min: job?.salary_min,
      salary_max: job?.salary_max,
      salary_period: job?.salary_period,
      posted_at: job ? `${job.postedDate}T10:00:00Z` : undefined,
    };
  });
}

export async function writeMatches(matches: MatchResult[]): Promise<void> {
  await writeFile(
    FILES.matches,
    [
      "id",
      "candidateName",
      "resumeId",
      "jobId",
      "jobTitle",
      "matchScore",
      "qualityScore",
      "breakdown",
      "recommendation",
      "matchedSkills",
      "missingSkills",
      "summary",
    ],
    matches.map((match) => ({
      id: match.id,
      candidateName: match.candidateName,
      resumeId: match.resume_id,
      jobId: match.jobId,
      jobTitle: match.jobTitle,
      matchScore: match.jd_match_score,
      qualityScore: match.resume_quality_score,
      breakdown: stringifyCsvJson(match.breakdown),
      recommendation: match.recommendation,
      matchedSkills: stringifyCsvList(match.matched_skills),
      missingSkills: stringifyCsvList(match.missing_skills),
      summary: match.summary || "",
    })),
  );
}

export async function readPrograms(): Promise<KnowledgeFactoryProgram[]> {
  return parseCsv(await readFile(FILES.programs), (row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    duration: row.duration,
    eligibility: row.eligibility,
    deadline: row.deadline,
    status: row.status as KnowledgeFactoryProgram["status"],
    ...programMetadata[row.id],
  }));
}

export async function readProfiles(): Promise<
  Array<{ user_id: string; profile: CandidateProfile }>
> {
  return parseCsv(await readFile(FILES.profiles), (row) => ({
    user_id: row.user_id,
    profile: {
      id: row.id,
      email: row.email,
      role: row.role as CandidateProfile["role"],
      first_name: row.first_name,
      last_name: row.last_name,
      headline: row.headline,
      location: row.location,
      phone: row.phone,
      linkedin_url: row.linkedin_url || undefined,
      portfolio_url: row.portfolio_url || undefined,
      bio: row.bio,
      skills: parseCsvList(row.skills),
      experience_years: Number(row.experience_years || 0),
      education: parseCsvJson(row.education, []),
      work_preferences: parseCsvJson(row.work_preferences, {
        desired_role: "",
        preferred_locations: [],
        salary_min: 0,
        salary_max: 0,
        remote_ok: false,
        job_types: [],
      }),
      resume_id: row.resume_id || undefined,
      avatar_url: row.avatar_url || undefined,
    },
  }));
}

export async function writeProfiles(
  profiles: Array<{ user_id: string; profile: CandidateProfile }>,
): Promise<void> {
  await writeFile(
    FILES.profiles,
    [
      "user_id",
      "id",
      "email",
      "role",
      "first_name",
      "last_name",
      "headline",
      "location",
      "phone",
      "linkedin_url",
      "portfolio_url",
      "bio",
      "skills",
      "experience_years",
      "education",
      "work_preferences",
      "resume_id",
      "avatar_url",
    ],
    profiles.map(({ user_id, profile }) => profileToRow(profile, user_id)),
  );
}

export async function readApplications(): Promise<
  Array<{ user_id: string; application: Application }>
> {
  return parseCsv(await readFile(FILES.applications), (row) => ({
    user_id: row.user_id,
    application: {
      id: row.id,
      job_id: row.job_id,
      job_title: row.job_title,
      company_name: row.company_name,
      location: row.location,
      status: row.status as Application["status"],
      applied_at: row.applied_at || undefined,
      resume_url: row.resume_url,
      cover_letter: row.cover_letter || undefined,
      portfolio_url: row.portfolio_url || undefined,
      answers_to_screening_questions: parseCsvJson(
        row.answers_to_screening_questions,
        [],
      ),
      timeline: parseCsvJson(row.timeline, []),
    },
  }));
}

export async function writeApplications(
  applications: Array<{ user_id: string; application: Application }>,
): Promise<void> {
  await writeFile(
    FILES.applications,
    [
      "user_id",
      "id",
      "job_id",
      "job_title",
      "company_name",
      "location",
      "status",
      "applied_at",
      "resume_url",
      "cover_letter",
      "portfolio_url",
      "answers_to_screening_questions",
      "timeline",
    ],
    applications.map(({ user_id, application }) =>
      applicationToRow(application, user_id),
    ),
  );
}

export async function readBookmarks(): Promise<BookmarkRecord[]> {
  return parseCsv(await readFile(FILES.bookmarks), (row) => ({
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    created_at: row.created_at,
  }));
}

export async function writeBookmarks(bookmarks: BookmarkRecord[]): Promise<void> {
  await writeFile(
    FILES.bookmarks,
    ["id", "user_id", "job_id", "created_at"],
    bookmarks,
  );
}

export async function readProgramApplications(): Promise<
  Array<{ user_id: string; application: KnowledgeFactoryApplication }>
> {
  return parseCsv(await readFile(FILES.programApplications), (row) => ({
    user_id: row.user_id,
    application: {
      id: row.id,
      program_id: row.program_id,
      program_name: row.program_name,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      university: row.university,
      linkedin_url: row.linkedin_url || undefined,
      resume_url: row.resume_url,
      statement_of_purpose: row.statement_of_purpose,
      status: row.status,
      submitted_at: row.submitted_at,
    },
  }));
}

export async function writeProgramApplications(
  applications: Array<{
    user_id: string;
    application: KnowledgeFactoryApplication;
  }>,
): Promise<void> {
  await writeFile(
    FILES.programApplications,
    [
      "id",
      "user_id",
      "program_id",
      "program_name",
      "full_name",
      "email",
      "phone",
      "university",
      "linkedin_url",
      "resume_url",
      "statement_of_purpose",
      "status",
      "submitted_at",
    ],
    applications.map(({ user_id, application }) =>
      programApplicationToRow(application, user_id),
    ),
  );
}

export async function readUploads(): Promise<UploadRecord[]> {
  return parseCsv(await readFile(FILES.uploads), (row) => ({
    user_id: row.user_id,
    upload_id: row.upload_id,
    resume_id: row.resume_id,
    status: row.status,
    candidate_name: row.candidate_name,
    extracted_skills: parseCsvList(row.extracted_skills),
    summary: row.summary,
    raw: parseCsvJson(row.raw, {}),
    created_at: row.created_at,
  }));
}

export async function writeUploads(uploads: UploadRecord[]): Promise<void> {
  await writeFile(
    FILES.uploads,
    [
      "user_id",
      "upload_id",
      "resume_id",
      "status",
      "candidate_name",
      "extracted_skills",
      "summary",
      "raw",
      "created_at",
    ],
    uploads.map((upload) => ({
      user_id: upload.user_id,
      upload_id: upload.upload_id,
      resume_id: upload.resume_id,
      status: upload.status,
      candidate_name: upload.candidate_name,
      extracted_skills: stringifyCsvList(upload.extracted_skills),
      summary: upload.summary,
      raw: stringifyCsvJson(upload.raw),
      created_at: upload.created_at,
    })),
  );
}

export function createAuthTokens(userId: string): {
  access_token: string;
  refresh_token: string;
} {
  return {
    access_token: buildToken(userId, "access"),
    refresh_token: buildToken(userId, "refresh"),
  };
}

export function extractUserIdFromToken(token: string | undefined): string | null {
  if (!token) {
    return null;
  }

  const [, kind, encodedUserId] = token.split(".");

  if (!kind || !encodedUserId) {
    return null;
  }

  try {
    return Buffer.from(encodedUserId, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function buildProfileCompleteness(profile: CandidateProfile): number {
  const checks = [
    Boolean(profile.headline),
    Boolean(profile.location),
    Boolean(profile.bio),
    profile.skills.length >= 4,
    profile.education.length > 0,
    Boolean(profile.work_preferences.desired_role),
    Boolean(profile.resume_id),
  ];
  const completeCount = checks.filter(Boolean).length;
  return Math.round((completeCount / checks.length) * 100);
}

export function buildMatchInsights(matches: MatchResult[]): MatchInsights {
  if (matches.length === 0) {
    return FALLBACK_MATCH_INSIGHTS;
  }

  const componentToPercent = (value: number | undefined, maxPoints: number) => {
    if (value == null || Number.isNaN(value)) {
      return 0;
    }

    // Older CSV seeds used ratios (0-1). Resume service returns weighted points.
    if (value <= 1) {
      return value * 100;
    }

    return (value / maxPoints) * 100;
  };

  const improvementTips = buildImprovementTips(matches);

  const overallMatch =
    matches.reduce((total, match) => total + match.jd_match_score, 0) /
    matches.length;
  const experienceMatch =
    matches.reduce(
      (total, match) =>
        total +
        componentToPercent(match.breakdown.jd_match.experience, 30),
      0,
    ) / matches.length;
  const skillsMatch =
    matches.reduce(
      (total, match) => total + componentToPercent(match.breakdown.jd_match.skills, 50),
      0,
    ) / matches.length;

  return {
    skills_match_percentage: Math.round(skillsMatch),
    experience_match_percentage: Math.round(experienceMatch),
    overall_match_percentage: Math.round(overallMatch),
    improvement_tips: improvementTips,
  };
}

function buildImprovementTips(matches: MatchResult[]): MatchInsightTip[] {
  const missingSkillCounts = new Map<string, number>();

  matches.forEach((match) => {
    match.missing_skills.forEach((skill) => {
      const normalized = skill.trim();
      if (!normalized) {
        return;
      }

      missingSkillCounts.set(normalized, (missingSkillCounts.get(normalized) || 0) + 1);
    });
  });

  const topMissing = Array.from(missingSkillCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([skill]) => skill);

  if (topMissing.length === 0) {
    return FALLBACK_MATCH_INSIGHTS.improvement_tips;
  }

  return topMissing.map((skill) => ({
    tip: `Add evidence for ${skill} (projects, work experience, or certifications) to improve your shortlist chances.`,
    impact: "+5%",
    category: "skills",
  }));
}

export function uploadToParseResult(upload: UploadRecord): ResumeParseResult {
  return {
    upload_id: upload.upload_id,
    resume_id: upload.resume_id,
    status: upload.status,
    candidate_name: upload.candidate_name,
    extracted_skills: upload.extracted_skills,
    summary: upload.summary,
    raw: upload.raw,
  };
}

function buildBreakdown(
  jdMatchScore: number,
  qualityScore: number,
): MatchBreakdown {
  return {
    jd_match: {
      skills: roundToTwoDecimals(Math.min(jdMatchScore / 100 + 0.02, 1)),
      experience: roundToTwoDecimals(Math.max(jdMatchScore / 100 - 0.04, 0)),
      keywords: roundToTwoDecimals(Math.min(jdMatchScore / 100 + 0.01, 1)),
    },
    resume_quality: {
      formatting: roundToTwoDecimals(Math.max(qualityScore / 100 - 0.03, 0)),
      clarity: roundToTwoDecimals(Math.min(qualityScore / 100 + 0.01, 1)),
      completeness: roundToTwoDecimals(Math.min(qualityScore / 100, 1)),
    },
  };
}

function parseSalaryDetails(salary: string): {
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  salary_period: SalaryPeriod;
} {
  const normalized = salary.toUpperCase();
  const currency = normalized.includes("GBP")
    ? "GBP"
    : normalized.includes("EUR")
      ? "EUR"
      : "USD";

  const salary_period = normalized.includes("/ DAY")
    ? "daily"
    : normalized.includes("/ HOURLY")
      ? "hourly"
      : "yearly";

  const values = Array.from(
    normalized.matchAll(/(\d+(?:\.\d+)?)(K)?/g),
    (match) => {
      const numericValue = Number(match[1]);
      return match[2] ? numericValue * 1000 : numericValue;
    },
  );

  return {
    salary_min: values[0] ?? 0,
    salary_max: values[1] ?? values[0] ?? 0,
    salary_currency: currency,
    salary_period,
  };
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildToken(userId: string, kind: "access" | "refresh"): string {
  return `dev.${kind}.${Buffer.from(userId, "utf8").toString("base64url")}`;
}

async function ensureFile(
  filePath: string,
  headers: string[],
  rows: Record<string, string | number | boolean>[],
): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    await writeFile(filePath, headers, rows);
  }
}

async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

async function writeFile(
  filePath: string,
  headers: string[],
  rows: Record<string, string | number | boolean>[],
): Promise<void> {
  await fs.writeFile(filePath, serializeCsv(headers, rows), "utf8");
}

function profileToRow(profile: CandidateProfile, userId: string) {
  return {
    user_id: userId,
    id: profile.id,
    email: profile.email,
    role: profile.role,
    first_name: profile.first_name,
    last_name: profile.last_name,
    headline: profile.headline,
    location: profile.location,
    phone: profile.phone,
    linkedin_url: profile.linkedin_url || "",
    portfolio_url: profile.portfolio_url || "",
    bio: profile.bio,
    skills: stringifyCsvList(profile.skills),
    experience_years: profile.experience_years,
    education: stringifyCsvJson(profile.education),
    work_preferences: stringifyCsvJson(profile.work_preferences),
    resume_id: profile.resume_id || "",
    avatar_url: profile.avatar_url || "",
  };
}

function applicationToRow(application: Application, userId: string) {
  return {
    user_id: userId,
    id: application.id,
    job_id: application.job_id,
    job_title: application.job_title || "",
    company_name: application.company_name || "",
    location: application.location || "",
    status: application.status,
    applied_at: application.applied_at || "",
    resume_url: application.resume_url,
    cover_letter: application.cover_letter || "",
    portfolio_url: application.portfolio_url || "",
    answers_to_screening_questions: stringifyCsvJson(
      application.answers_to_screening_questions || [],
    ),
    timeline: stringifyCsvJson(application.timeline || []),
  };
}

function programApplicationToRow(
  application: KnowledgeFactoryApplication,
  userId: string,
) {
  return {
    id: application.id,
    user_id: userId,
    program_id: application.program_id,
    program_name: application.program_name,
    full_name: application.full_name,
    email: application.email,
    phone: application.phone,
    university: application.university,
    linkedin_url: application.linkedin_url || "",
    resume_url: application.resume_url,
    statement_of_purpose: application.statement_of_purpose,
    status: application.status,
    submitted_at: application.submitted_at,
  };
}
