import {
  JobStatus,
  MatchRecommendation,
  type Application,
  type ApplicationStatus,
  type CandidateProfile,
  type Job,
  type KnowledgeFactoryApplication,
  type KnowledgeFactoryProgram,
  type MatchInsights,
  type MatchResult,
  type ResumeParseResult,
} from "../types";

export const FALLBACK_JOBS: Job[] = [
  {
    id: "job_001",
    title: "Senior Product Engineer",
    department: "Engineering",
    location: "San Francisco / Remote",
    type: "Full-time",
    salary: "$160k - $210k",
    description:
      "Lead the development of our next-gen AI workspace. You'll work closely with the design team to build highly interactive, performant UI components.",
    icon: "developer_mode",
    status: JobStatus.ACTIVE,
    postedDate: "2026-04-01",
    company_name: "Lumina Systems",
    match_score: 98,
  },
  {
    id: "job_002",
    title: "UI/UX Motion Designer",
    department: "Design",
    location: "London, UK",
    type: "Contract",
    salary: "GBP 500 - 700 / day",
    description:
      'Help us define the "liquid motion" language of our brand. We need someone who understands the balance between aesthetics and utility.',
    icon: "brush",
    status: JobStatus.ACTIVE,
    postedDate: "2026-03-28",
    company_name: "Vortex Agency",
    match_score: 84,
  },
  {
    id: "job_003",
    title: "Growth Marketing Lead",
    department: "Marketing",
    location: "Remote",
    type: "Full-time",
    salary: "$140k - $190k",
    description:
      "Drive user acquisition and retention through data-led storytelling. You'll manage a multi-channel budget and spearhead expansion.",
    icon: "insights",
    status: JobStatus.ACTIVE,
    postedDate: "2026-04-02",
    company_name: "Coastal Technologies",
    match_score: 91,
  },
];

export const FALLBACK_MATCHES: MatchResult[] = [
  {
    id: "match_001",
    candidateName: "Sarah Johnson",
    resume_id: "resume_sarah_001",
    jobId: "job_001",
    jobTitle: "Senior Product Engineer",
    jd_match_score: 98,
    resume_quality_score: 91,
    breakdown: {
      jd_match: {
        skills: 0.98,
        experience: 0.94,
        keywords: 0.96,
      },
      resume_quality: {
        formatting: 0.9,
        clarity: 0.93,
        completeness: 0.91,
      },
    },
    matched_skills: [
      "React",
      "TypeScript",
      "Design Systems",
      "Product Strategy",
    ],
    missing_skills: ["WebGL"],
    recommendation: MatchRecommendation.SHORTLIST,
    summary:
      "JD match 98/100 and resume quality 91/100. Strong alignment on React, TypeScript, and Design Systems.",
    company_name: "Lumina Systems",
    location: "San Francisco / Remote",
    job_type: "Full-time",
    salary_min: 160000,
    salary_max: 210000,
    salary_period: "yearly",
    posted_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "match_002",
    candidateName: "Sarah Johnson",
    resume_id: "resume_sarah_001",
    jobId: "job_004",
    jobTitle: "Product Design Lead",
    jd_match_score: 92,
    resume_quality_score: 89,
    breakdown: {
      jd_match: {
        skills: 0.92,
        experience: 0.9,
        keywords: 0.88,
      },
      resume_quality: {
        formatting: 0.88,
        clarity: 0.9,
        completeness: 0.89,
      },
    },
    matched_skills: ["Leadership", "Product Strategy", "UI/UX", "Agile"],
    missing_skills: ["Fintech"],
    recommendation: MatchRecommendation.SHORTLIST,
    summary:
      "JD match 92/100 and resume quality 89/100. Strong alignment on leadership and product strategy.",
    company_name: "Horizon Fintech",
    location: "New York, NY",
    job_type: "Full-time",
    salary_min: 170000,
    salary_max: 220000,
    salary_period: "yearly",
    posted_at: "2026-03-28T14:30:00Z",
  },
  {
    id: "match_003",
    candidateName: "Sarah Johnson",
    resume_id: "resume_sarah_001",
    jobId: "job_002",
    jobTitle: "UI/UX Motion Designer",
    jd_match_score: 85,
    resume_quality_score: 88,
    breakdown: {
      jd_match: {
        skills: 0.86,
        experience: 0.83,
        keywords: 0.84,
      },
      resume_quality: {
        formatting: 0.89,
        clarity: 0.87,
        completeness: 0.88,
      },
    },
    matched_skills: [
      "Qualitative Research",
      "Testing",
      "Analytics",
      "Interviews",
    ],
    missing_skills: ["Motion Systems"],
    recommendation: MatchRecommendation.REVIEW,
    summary:
      "JD match 85/100 and resume quality 88/100. Strong alignment on research and testing with one skill gap.",
    company_name: "Vortex Agency",
    location: "London, UK",
    job_type: "Contract",
    salary_min: 500,
    salary_max: 700,
    salary_period: "daily",
    posted_at: "2026-04-05T09:15:00Z",
  },
];

export const FALLBACK_PROGRAMS: KnowledgeFactoryProgram[] = [
  {
    id: "prog_001",
    name: "AI Product Innovation Track",
    category: "Product",
    description:
      "Work on high-impact AI product projects guided by industry mentors.",
    duration: "12 weeks",
    eligibility:
      "Final-year students, recent graduates, and early-career product builders.",
    deadline: "2026-05-15",
    status: "Open",
    duration_weeks: 12,
    start_date: "2026-06-01",
    mentor_count: 8,
    spots_available: 45,
    spots_total: 60,
    tags: ["AI/ML", "Product Strategy", "Innovation", "Leadership"],
  },
  {
    id: "prog_002",
    name: "Advanced Design Systems Cohort",
    category: "Design",
    description:
      "Build enterprise-grade design systems with hands-on mentorship from senior design engineers.",
    duration: "8 weeks",
    eligibility:
      "Designers with a portfolio and basic Figma proficiency.",
    deadline: "2026-06-10",
    status: "Open",
    duration_weeks: 8,
    start_date: "2026-07-15",
    mentor_count: 5,
    spots_available: 20,
    spots_total: 30,
    tags: ["Design Systems", "Figma", "Accessibility"],
  },
  {
    id: "prog_003",
    name: "Data Storytelling Lab",
    category: "Business",
    description:
      "Translate raw data into persuasive business narratives and executive dashboards.",
    duration: "6 weeks",
    eligibility:
      "Candidates with basic Excel or analytics experience.",
    deadline: "2026-07-01",
    status: "Upcoming",
    duration_weeks: 6,
    start_date: "2026-08-05",
    mentor_count: 4,
    spots_available: 30,
    spots_total: 35,
    tags: ["Analytics", "Presentation", "Storytelling"],
  },
];

export const FALLBACK_PROFILE: CandidateProfile = {
  id: "cand_001",
  email: "sarah.johnson@email.com",
  role: "candidate",
  first_name: "Sarah",
  last_name: "Johnson",
  headline:
    "Senior Product Designer with 8 years of experience in AI-driven UX",
  location: "San Francisco, CA",
  phone: "+1 (415) 555-0142",
  linkedin_url: "https://linkedin.com/in/sarahjohnson",
  portfolio_url: "https://sarahjohnson.design",
  bio: "Passionate about creating intuitive, data-informed user experiences for AI-powered products.",
  skills: [
    "Figma",
    "Design Systems",
    "User Research",
    "Prototyping",
    "UI/UX",
    "Product Strategy",
  ],
  experience_years: 8,
  education: [
    {
      institution: "Stanford University",
      degree: "Master of Fine Arts",
      field_of_study: "Design",
      graduation_year: 2017,
    },
  ],
  work_preferences: {
    desired_role: "Senior Product Designer",
    preferred_locations: ["San Francisco, CA", "Remote", "New York, NY"],
    salary_min: 160000,
    salary_max: 210000,
    remote_ok: true,
    job_types: ["Full-time", "Contract"],
  },
  resume_id: "resume_sarah_001",
};

export const FALLBACK_APPLICATIONS: Application[] = [
  {
    id: "app_001",
    job_id: "job_005",
    job_title: "Senior Product Designer",
    company_name: "Coastal Technologies",
    location: "San Francisco, CA",
    status: "Shortlisted",
    applied_at: "2026-04-03T10:00:00Z",
    resume_url: "https://cdn.coastalcareers.io/resumes/sarah-johnson-resume-2026.pdf",
    cover_letter:
      "Excited to contribute to AI-powered product experiences at Coastal Technologies.",
    timeline: buildTimeline("Shortlisted", "2026-04-03T10:00:00Z"),
  },
  {
    id: "app_002",
    job_id: "job_006",
    job_title: "Data Analyst",
    company_name: "Quantum Analytics",
    location: "Austin, TX",
    status: "Under Review",
    applied_at: "2026-04-05T12:30:00Z",
    resume_url: "https://cdn.coastalcareers.io/resumes/sarah-johnson-resume-2026.pdf",
    timeline: buildTimeline("Under Review", "2026-04-05T12:30:00Z"),
  },
  {
    id: "app_003",
    job_id: "job_007",
    job_title: "UX Researcher",
    company_name: "Nexus Health",
    location: "Remote",
    status: "Applied",
    applied_at: "2026-04-06T08:15:00Z",
    resume_url: "https://cdn.coastalcareers.io/resumes/sarah-johnson-resume-2026.pdf",
    timeline: buildTimeline("Applied", "2026-04-06T08:15:00Z"),
  },
];

export const FALLBACK_BOOKMARKED_JOB_IDS = ["job_001", "job_003"];

export const FALLBACK_MATCH_INSIGHTS: MatchInsights = {
  skills_match_percentage: 94,
  experience_match_percentage: 82,
  overall_match_percentage: 88,
  improvement_tips: [
    {
      tip: "Add 2 more leadership examples to boost your match score by ~8%.",
      impact: "+8%",
      category: "experience",
    },
    {
      tip: "Complete your skills assessment to boost your AI match accuracy by up to 40%.",
      impact: "+40%",
      category: "skills",
    },
  ],
};

export const FALLBACK_RESUME_PARSE_RESULT: ResumeParseResult = {
  upload_id: "upload_001",
  resume_id: "resume_sarah_001",
  status: "parsed",
  candidate_name: "Sarah Johnson",
  extracted_skills: [
    "Figma",
    "Design Systems",
    "User Research",
    "Prototyping",
    "UI/UX",
    "Product Strategy",
  ],
  summary:
    "Resume quality 91/100. Strong product design foundation with clear AI-adjacent experience.",
  raw: {
    candidate_type: "lateral",
    warnings: [],
  },
};

export const FALLBACK_PROGRAM_APPLICATIONS: KnowledgeFactoryApplication[] = [
  {
    id: "kfa_001",
    program_id: "prog_001",
    program_name: "AI Product Innovation Track",
    full_name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (415) 555-0142",
    university: "Stanford University",
    linkedin_url: "https://linkedin.com/in/sarahjohnson",
    resume_url: "https://cdn.coastalcareers.io/resumes/sarah-johnson-resume-2026.pdf",
    statement_of_purpose:
      "I want to expand my product design background into AI-led product strategy.",
    status: "Submitted",
    submitted_at: "2026-04-02T15:00:00Z",
  },
];

export const FALLBACK_AUTH_USER = {
  id: "cand_001",
  email: "sarah.johnson@email.com",
  password: "Str0ng!Passw0rd",
  first_name: "Sarah",
  last_name: "Johnson",
  role: "candidate" as const,
  phone: "+1 (415) 555-0142",
};

function buildTimeline(
  status: ApplicationStatus,
  appliedAt: string,
) {
  const baseTimeline: Record<ApplicationStatus, ApplicationStatus[]> = {
    Applied: ["Applied"],
    "Under Review": ["Applied", "Under Review"],
    Shortlisted: ["Applied", "Under Review", "Shortlisted"],
    Interview: ["Applied", "Under Review", "Shortlisted", "Interview"],
    Decision: [
      "Applied",
      "Under Review",
      "Shortlisted",
      "Interview",
      "Decision",
    ],
  };

  return baseTimeline[status].map((step, index) => ({
    status: step,
    changed_at: new Date(
      Date.parse(appliedAt) + index * 24 * 60 * 60 * 1000,
    ).toISOString(),
  }));
}
