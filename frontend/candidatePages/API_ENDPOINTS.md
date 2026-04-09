# Coastal Careers -- API Endpoint Reference

> AI-powered career matching platform. All endpoints use `/api/v1` prefix. Requests require `Content-Type: application/json` unless noted.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User Profile](#2-user-profile)
3. [Job Listings](#3-job-listings)
4. [Applications](#4-applications)
5. [Resume / Smart Match](#5-resume--smart-match)
6. [Knowledge Factory](#6-knowledge-factory)
7. [Recruiter Dashboard](#7-recruiter-dashboard)
8. [Admin Analytics](#8-admin-analytics)

---

## 1. Authentication

### 1.1 Register

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/auth/register` |
| **Description** | Create a new candidate or recruiter account |

**Request Body Schema**

```json
{
  "email": "string",
  "password": "string",
  "first_name": "string",
  "last_name": "string",
  "role": "\"candidate\" | \"recruiter\" | \"admin\"",
  "phone": "string (optional)"
}
```

**Example Test Payload**

```json
{
  "email": "sarah.johnson@email.com",
  "password": "Str0ng!Passw0rd",
  "first_name": "Sarah",
  "last_name": "Johnson",
  "role": "candidate",
  "phone": "+1 (415) 555-0142"
}
```

---

### 1.2 Login

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/auth/login` |
| **Description** | Authenticate and receive access + refresh tokens |

**Request Body Schema**

```json
{
  "email": "string",
  "password": "string"
}
```

**Example Test Payload**

```json
{
  "email": "sarah.johnson@email.com",
  "password": "Str0ng!Passw0rd"
}
```

---

### 1.3 Refresh Token

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/auth/refresh` |
| **Description** | Obtain a new access token using a valid refresh token |

**Request Body Schema**

```json
{
  "refresh_token": "string"
}
```

**Example Test Payload**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTUwZTg2NzAtZTY5Yi00YjIwLWE5YjktMjJkYjRjNTYwMjYxIiwiZXhwIjoxNzQ0MDAwMDAwfQ.dGVzdF9zaWduYXR1cmU"
}
```

---

### 1.4 Logout

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/auth/logout` |
| **Description** | Invalidate current session tokens |

**Auth Required**: Yes

---

### 1.5 Forgot Password

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/auth/forgot-password` |
| **Description** | Send password reset email |

**Request Body Schema**

```json
{
  "email": "string"
}
```

**Example Test Payload**

```json
{
  "email": "sarah.johnson@email.com"
}
```

---

### 1.6 Reset Password

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/auth/reset-password` |
| **Description** | Set a new password using a reset token |

**Request Body Schema**

```json
{
  "token": "string",
  "new_password": "string"
}
```

**Example Test Payload**

```json
{
  "token": "rst_a1b2c3d4e5f6g7h8i9j0",
  "new_password": "N3w!S3cur3Pass"
}
```

---

## 2. User Profile

### 2.1 Get Candidate Profile

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/profiles/me` |
| **Description** | Retrieve the authenticated candidate's full profile |

**Auth Required**: Yes

---

### 2.2 Update Candidate Profile

| Field | Value |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/v1/profiles/me` |
| **Description** | Update candidate profile information |

**Auth Required**: Yes

**Request Body Schema**

```json
{
  "first_name": "string",
  "last_name": "string",
  "headline": "string",
  "location": "string",
  "phone": "string",
  "linkedin_url": "string (optional)",
  "portfolio_url": "string (optional)",
  "bio": "string",
  "skills": ["string"],
  "experience_years": "number",
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field_of_study": "string",
      "graduation_year": "number"
    }
  ],
  "work_preferences": {
    "desired_role": "string",
    "preferred_locations": ["string"],
    "salary_min": "number",
    "salary_max": "number",
    "remote_ok": "boolean",
    "job_types": ["Full-time", "Contract", "Part-time"]
  }
}
```

**Example Test Payload**

```json
{
  "first_name": "Sarah",
  "last_name": "Johnson",
  "headline": "Senior Product Designer with 8 years of experience in AI-driven UX",
  "location": "San Francisco, CA",
  "phone": "+1 (415) 555-0142",
  "linkedin_url": "https://linkedin.com/in/sarahjohnson",
  "portfolio_url": "https://sarahjohnson.design",
  "bio": "Passionate about creating intuitive, data-informed user experiences for AI-powered products.",
  "skills": ["Figma", "Design Systems", "User Research", "Prototyping", "UI/UX", "Product Strategy"],
  "experience_years": 8,
  "education": [
    {
      "institution": "Stanford University",
      "degree": "Master of Fine Arts",
      "field_of_study": "Design",
      "graduation_year": 2017
    }
  ],
  "work_preferences": {
    "desired_role": "Senior Product Designer",
    "preferred_locations": ["San Francisco, CA", "Remote", "New York, NY"],
    "salary_min": 160000,
    "salary_max": 210000,
    "remote_ok": true,
    "job_types": ["Full-time", "Contract"]
  }
}
```

---

### 2.3 Get Recruiter Profile

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/profiles/recruiter/me` |
| **Description** | Retrieve the authenticated recruiter's profile and company info |

**Auth Required**: Yes

---

### 2.4 Update Recruiter Profile

| Field | Value |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/v1/profiles/recruiter/me` |
| **Description** | Update recruiter profile and company details |

**Auth Required**: Yes

**Request Body Schema**

```json
{
  "first_name": "string",
  "last_name": "string",
  "title": "string",
  "company_name": "string",
  "company_description": "string",
  "company_website": "string",
  "company_size": "\"1-10\" | \"11-50\" | \"51-200\" | \"201-500\" | \"501-1000\" | \"1000+\"",
  "company_industry": "string",
  "phone": "string",
  "avatar_url": "string (optional)"
}
```

**Example Test Payload**

```json
{
  "first_name": "Marcus",
  "last_name": "Chen",
  "title": "Head of Talent Acquisition",
  "company_name": "Coastal Horizon Labs",
  "company_description": "Building the next generation of AI-powered workplace tools.",
  "company_website": "https://coastalhorizonlabs.io",
  "company_size": "51-200",
  "company_industry": "Artificial Intelligence",
  "phone": "+1 (650) 555-0198"
}
```

---

## 3. Job Listings

### 3.1 List Jobs (Search / Filter)

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/jobs` |
| **Description** | Search and filter job listings with pagination. Supports AI relevance sorting |

**Query Parameters**

```
?q=string (search keyword)
&location=string
&job_type=Full-time|Contract|Part-time|Internship
&department=Engineering|Design|Product|Marketing
&remote_only=true|false
&salary_min=number
&salary_max=number
&sort_by=relevance|date|salary
&page=number
&limit=number
```

**Example Request**

```
GET /api/v1/jobs?q=product+engineer&location=San+Francisco&remote_only=true&sort_by=relevance&page=1&limit=20
```

---

### 3.2 Get Job Details

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/jobs/:jobId` |
| **Description** | Retrieve full job posting details including AI match percentage for the current user |

**Auth Required**: Yes (for AI match score)

---

### 3.3 Create Job

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/jobs` |
| **Description** | Create a new job posting (recruiter only) |

**Auth Required**: Yes (recruiter role)

**Request Body Schema**

```json
{
  "title": "string",
  "company_name": "string",
  "company_logo_url": "string (optional)",
  "location": "string",
  "remote_ok": "boolean",
  "job_type": "\"Full-time\" | \"Contract\" | \"Part-time\" | \"Internship\"",
  "department": "\"Engineering\" | \"Design\" | \"Product\" | \"Marketing\" | \"Data Science\"",
  "salary_min": "number (optional)",
  "salary_max": "number (optional)",
  "salary_currency": "string",
  "salary_period": "\"yearly\" | \"daily\" | \"hourly\"",
  "description": "string",
  "responsibilities": ["string"],
  "requirements": ["string"],
  "nice_to_have": ["string"],
  "benefits": ["string"],
  "application_deadline": "ISO 8601 date string (optional)",
  "status": "\"draft\" | \"active\" | \"paused\" | \"closed\""
}
```

**Example Test Payload**

```json
{
  "title": "Senior Product Engineer",
  "company_name": "Lumina Systems",
  "company_logo_url": "https://cdn.coastalcareers.io/logos/lumina-systems.png",
  "location": "San Francisco, CA",
  "remote_ok": true,
  "job_type": "Full-time",
  "department": "Engineering",
  "salary_min": 160000,
  "salary_max": 210000,
  "salary_currency": "USD",
  "salary_period": "yearly",
  "description": "Lead the development of our next-gen AI workspace. You'll work closely with the design team to build highly interactive, performant UI components using modern web technologies.",
  "responsibilities": [
    "Architect and build scalable frontend components",
    "Collaborate with designers on interactive AI-driven experiences",
    "Mentor junior engineers and drive code quality standards",
    "Optimize application performance and Core Web Vitals"
  ],
  "requirements": [
    "6+ years of experience building production web applications",
    "Deep expertise in React, TypeScript, and modern CSS",
    "Experience with AI/ML product integrations",
    "Strong system design and communication skills"
  ],
  "nice_to_have": [
    "Experience with Three.js or WebGL",
    "Background in design systems or creative coding",
    "Open-source contributions"
  ],
  "benefits": [
    "Competitive equity package",
    "Unlimited PTO",
    "Home office stipend",
    "Annual learning budget of $3,000"
  ],
  "application_deadline": "2026-06-30",
  "status": "active"
}
```

---

### 3.4 Update Job

| Field | Value |
|---|---|
| **Method** | `PUT` |
| **URL** | `/api/v1/jobs/:jobId` |
| **Description** | Update an existing job posting |

**Auth Required**: Yes (recruiter who owns the posting)

**Request Body Schema** -- same as 3.3 Create Job (all fields optional)

**Example Test Payload**

```json
{
  "title": "Senior Product Engineer",
  "salary_min": 170000,
  "salary_max": 220000,
  "status": "active",
  "responsibilities": [
    "Architect and build scalable frontend components",
    "Collaborate with designers on interactive AI-driven experiences",
    "Mentor junior engineers and drive code quality standards",
    "Optimize application performance and Core Web Vitals",
    "Lead technical discovery sessions with product team"
  ]
}
```

---

### 3.5 Delete Job

| Field | Value |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/v1/jobs/:jobId` |
| **Description** | Soft-delete a job posting |

**Auth Required**: Yes (recruiter who owns the posting)

---

### 3.6 Bookmark / Save Job

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/jobs/:jobId/bookmark` |
| **Description** | Save a job to the candidate's bookmarked list |

**Auth Required**: Yes

---

### 3.7 Remove Bookmark

| Field | Value |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/v1/jobs/:jobId/bookmark` |
| **Description** | Remove a job from the candidate's bookmarked list |

**Auth Required**: Yes

---

### 3.8 List Bookmarked Jobs

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/jobs/bookmarked` |
| **Description** | Retrieve all bookmarked jobs for the current candidate |

**Auth Required**: Yes

---

## 4. Applications

### 4.1 Submit Application

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/applications` |
| **Description** | Apply to a job posting |

**Auth Required**: Yes

**Request Body Schema**

```json
{
  "job_id": "string (UUID)",
  "cover_letter": "string (optional)",
  "resume_url": "string",
  "portfolio_url": "string (optional)",
  "answers_to_screening_questions": [
    {
      "question_id": "string",
      "answer": "string"
    }
  ]
}
```

**Example Test Payload**

```json
{
  "job_id": "7f3a9c2e-4d1b-4e8a-b5c6-1a2b3c4d5e6f",
  "cover_letter": "I am excited to apply for the Senior Product Designer role at Coastal Technologies. With 8 years of experience designing AI-powered products, I bring a deep understanding of balancing aesthetics with utility. At my current role, I led the redesign of our core workspace platform, improving user engagement by 34%.",
  "resume_url": "https://cdn.coastalcareers.io/resumes/sarah-johnson-resume-2026.pdf",
  "portfolio_url": "https://sarahjohnson.design",
  "answers_to_screening_questions": [
    {
      "question_id": "q1",
      "answer": "8 years"
    },
    {
      "question_id": "q2",
      "answer": "Figma, Framer, Principle, After Effects"
    },
    {
      "question_id": "q3",
      "answer": "Yes, I have led cross-functional teams of 5+ designers and engineers on multiple products."
    }
  ]
}
```

---

### 4.2 List My Applications

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/applications/me` |
| **Description** | Retrieve all applications submitted by the current candidate |

**Auth Required**: Yes

**Query Parameters**

```
?status=Applied|Under Review|Shortlisted|Interview|Decision
&page=number
&limit=number
```

---

### 4.3 Get Application Details

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/applications/:applicationId` |
| **Description** | Retrieve details and status timeline for a specific application |

**Auth Required**: Yes

---

### 4.4 Update Application Status (Recruiter)

| Field | Value |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/api/v1/applications/:applicationId/status` |
| **Description** | Update the status of a candidate's application |

**Auth Required**: Yes (recruiter role)

**Request Body Schema**

```json
{
  "status": "\"Applied\" | \"Under Review\" | \"Shortlisted\" | \"Interview\" | \"Decision\"",
  "notes": "string (optional)"
}
```

**Example Test Payload**

```json
{
  "status": "Shortlisted",
  "notes": "Strong portfolio. Impressive work on AI workspace redesign. Recommend moving to interview stage."
}
```

---

### 4.5 List Applications for Job (Recruiter)

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/jobs/:jobId/applications` |
| **Description** | Retrieve all applications for a specific job posting |

**Auth Required**: Yes (recruiter role)

**Query Parameters**

```
?status=Applied|Under Review|Shortlisted|Interview|Decision
&sort_by=ai_match|date|name
&page=number
&limit=number
```

---

## 5. Resume / Smart Match

### 5.1 Upload Resume

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/resume/upload` |
| **Description** | Upload a resume file (PDF or DOCX). Returns parsed resume data and triggers AI matching |

**Auth Required**: Yes

**Content-Type**: `multipart/form-data`

**Request Body**

```
file: <binary> (PDF or DOCX, max 10MB)
```

---

### 5.2 Get AI Matches

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/matches` |
| **Description** | Retrieve AI-matched job recommendations for the current candidate |

**Auth Required**: Yes

**Query Parameters**

```
?limit=number (default 10)
&min_match_score=number (0-100)
```

**Example Response Payload**

```json
{
  "matches": [
    {
      "job_id": "7f3a9c2e-4d1b-4e8a-b5c6-1a2b3c4d5e6f",
      "match_score": 98,
      "title": "Senior UX Architect",
      "company": "Lumina Systems",
      "location": "Remote",
      "job_type": "Full-time",
      "salary_min": 155000,
      "salary_max": 195000,
      "matched_tags": ["Figma", "Design Systems", "User Research", "Prototyping"],
      "posted_at": "2026-04-01T10:00:00Z"
    },
    {
      "job_id": "8a4b0d3f-5e2c-4f9b-c6d7-2b3c4d5e6f7a",
      "match_score": 92,
      "title": "Product Design Lead",
      "company": "Horizon Fintech",
      "location": "New York, NY",
      "job_type": "Full-time",
      "salary_min": 170000,
      "salary_max": 220000,
      "matched_tags": ["Leadership", "Product Strategy", "UI/UX", "Agile"],
      "posted_at": "2026-03-28T14:30:00Z"
    },
    {
      "job_id": "9b5c1e4a-6f3d-4a0c-d7e8-3c4d5e6f7a8b",
      "match_score": 85,
      "title": "UX Research Specialist",
      "company": "Vortex Agency",
      "location": "London, UK",
      "job_type": "Contract",
      "salary_min": 500,
      "salary_max": 700,
      "salary_period": "daily",
      "matched_tags": ["Qualitative Research", "Testing", "Analytics", "Interviews"],
      "posted_at": "2026-04-05T09:15:00Z"
    }
  ],
  "total_matches": 12,
  "profile_completeness": 87
}
```

---

### 5.3 Get Resume Parse Result

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/resume/:uploadId/parse-result` |
| **Description** | Retrieve the parsed resume data extracted by the AI parser |

**Auth Required**: Yes

---

### 5.4 Get Match Insights

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/matches/insights` |
| **Description** | Retrieve AI-driven match insights including skills match %, experience match %, and improvement tips |

**Auth Required**: Yes

**Example Response Payload**

```json
{
  "skills_match_percentage": 94,
  "experience_match_percentage": 82,
  "overall_match_percentage": 88,
  "improvement_tips": [
    {
      "tip": "Add 2 more leadership examples to boost your match score by ~8%.",
      "impact": "+8%",
      "category": "experience"
    },
    {
      "tip": "Complete your skills assessment to boost your AI match accuracy by up to 40%.",
      "impact": "+40%",
      "category": "skills"
    }
  ]
}
```

---

## 6. Knowledge Factory

### 6.1 List Programs

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/knowledge-factory/programs` |
| **Description** | Retrieve all available Knowledge Factory programs and learning tracks |

**Query Parameters**

```
?category=Engineering|Design|Product|Business
&enrollment_status=Open|Closed|Upcoming
&page=number
&limit=number
```

**Example Response Payload**

```json
{
  "programs": [
    {
      "id": "prog_001",
      "title": "AI Product Innovation Track",
      "category": "Product",
      "description": "Work on high-impact AI product projects guided by industry mentors.",
      "duration_weeks": 12,
      "enrollment_status": "Open",
      "start_date": "2026-06-01",
      "spots_available": 45,
      "spots_total": 60,
      "mentor_count": 8,
      "tags": ["AI/ML", "Product Strategy", "Innovation", "Leadership"]
    },
    {
      "id": "prog_002",
      "title": "Advanced Design Systems Cohort",
      "category": "Design",
      "description": "Build enterprise-grade design systems with hands-on mentorship from senior design engineers.",
      "duration_weeks": 8,
      "enrollment_status": "Open",
      "start_date": "2026-07-15",
      "spots_available": 20,
      "spots_total": 30,
      "mentor_count": 5,
      "tags": ["Design Systems", "Figma", "Component Architecture", "Accessibility"]
    }
  ],
  "total": 6
}
```

---

### 6.2 Get Program Details

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/knowledge-factory/programs/:programId` |
| **Description** | Retrieve detailed information about a specific Knowledge Factory program |

---

### 6.3 Apply to Program

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/knowledge-factory/programs/:programId/apply` |
| **Description** | Submit an application to a Knowledge Factory program |

**Auth Required**: Yes

**Request Body Schema**

```json
{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "university": "string",
  "linkedin_url": "string (optional)",
  "resume_url": "string",
  "statement_of_purpose": "string",
  "program_id": "string"
}
```

**Example Test Payload**

```json
{
  "full_name": "John Doe",
  "email": "john.doe@university.edu",
  "phone": "+1 (555) 123-4567",
  "university": "Stanford University",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "resume_url": "https://cdn.coastalcareers.io/resumes/john-doe-resume.pdf",
  "statement_of_purpose": "I am passionate about building AI-powered products that solve real-world problems. This program aligns perfectly with my goal of transitioning from academic research to industry product innovation.",
  "program_id": "prog_001"
}
```

---

### 6.4 List My Program Applications

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/knowledge-factory/applications/me` |
| **Description** | Retrieve all Knowledge Factory program applications submitted by the current user |

**Auth Required**: Yes

---

## 7. Recruiter Dashboard

### 7.1 Get Candidate Pipeline

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/recruiter/pipeline` |
| **Description** | Retrieve the candidate pipeline for a recruiter's active job postings |

**Auth Required**: Yes (recruiter role)

**Query Parameters**

```
?job_id=string (optional, filter by specific job)
&department=Engineering|Design|Product|Marketing
&status=Applied|Under Review|Shortlisted|Interview|Decision
&min_ai_score=number (0-100)
&sort_by=ai_match|date|name
&page=number
&limit=number
```

**Example Request**

```
GET /api/v1/recruiter/pipeline?department=Engineering&min_ai_score=60&sort_by=ai_match&page=1&limit=20
```

**Example Response Payload**

```json
{
  "candidates": [
    {
      "id": "cand_001",
      "name": "Amit Kumar",
      "initials": "AK",
      "location": "Mumbai, India",
      "email": "amit.kumar@email.com",
      "phone": "+91 98765 43210",
      "ai_match_score": 96,
      "status": "Shortlisted",
      "applied_to": "Senior Product Designer",
      "experience_years": 8,
      "available_immediately": true,
      "resume_url": "https://cdn.coastalcareers.io/resumes/amit-kumar.pdf",
      "applied_at": "2026-04-01T08:30:00Z"
    },
    {
      "id": "cand_002",
      "name": "Sarah Lee",
      "initials": "SL",
      "location": "Austin, TX",
      "email": "sarah.lee@email.com",
      "ai_match_score": 89,
      "status": "Interview",
      "applied_to": "Frontend Engineer",
      "experience_years": 5,
      "available_immediately": false,
      "resume_url": "https://cdn.coastalcareers.io/resumes/sarah-lee.pdf",
      "applied_at": "2026-04-03T14:20:00Z"
    },
    {
      "id": "cand_003",
      "name": "Raj Joshi",
      "initials": "RJ",
      "location": "Bangalore, India",
      "email": "raj.joshi@email.com",
      "ai_match_score": 84,
      "status": "Applied",
      "applied_to": "Senior Product Designer",
      "experience_years": 6,
      "available_immediately": true,
      "resume_url": "https://cdn.coastalcareers.io/resumes/raj-joshi.pdf",
      "applied_at": "2026-04-05T11:00:00Z"
    },
    {
      "id": "cand_004",
      "name": "Elena Park",
      "initials": "EP",
      "location": "Seattle, WA",
      "email": "elena.park@email.com",
      "ai_match_score": 78,
      "status": "Under Review",
      "applied_to": "Product Manager",
      "experience_years": 7,
      "available_immediately": false,
      "resume_url": "https://cdn.coastalcareers.io/resumes/elena-park.pdf",
      "applied_at": "2026-04-06T09:45:00Z"
    },
    {
      "id": "cand_005",
      "name": "David Moyo",
      "initials": "DM",
      "location": "London, UK",
      "email": "david.moyo@email.com",
      "ai_match_score": 72,
      "status": "Applied",
      "applied_to": "Frontend Engineer",
      "experience_years": 4,
      "available_immediately": true,
      "resume_url": "https://cdn.coastalcareers.io/resumes/david-moyo.pdf",
      "applied_at": "2026-04-07T16:10:00Z"
    }
  ],
  "total": 142,
  "pipeline_health": {
    "active_candidates": 142,
    "weekly_change_percent": 12
  }
}
```

---

### 7.2 Get Candidate Detail

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/recruiter/candidates/:candidateId` |
| **Description** | Retrieve full candidate profile and application history |

**Auth Required**: Yes (recruiter role)

---

### 7.3 Bulk Update Candidate Status

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/recruiter/candidates/bulk-update` |
| **Description** | Perform bulk status updates on multiple candidates |

**Auth Required**: Yes (recruiter role)

**Request Body Schema**

```json
{
  "candidate_ids": ["string"],
  "action": "\"shortlist\" | \"reject\" | \"move_to_interview\" | \"send_email\"",
  "notes": "string (optional)",
  "email_template_id": "string (optional, required for send_email action)"
}
```

**Example Test Payload**

```json
{
  "candidate_ids": ["cand_001", "cand_003", "cand_007"],
  "action": "shortlist",
  "notes": "Strong match for Senior Product Designer role. Moving to interview stage."
}
```

---

### 7.4 Send Email to Candidate

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/recruiter/candidates/:candidateId/email` |
| **Description** | Send an email to a candidate from the recruiter dashboard |

**Auth Required**: Yes (recruiter role)

**Request Body Schema**

```json
{
  "subject": "string",
  "body": "string",
  "template_id": "string (optional)"
}
```

**Example Test Payload**

```json
{
  "subject": "Interview Invitation -- Senior Product Designer at Coastal Technologies",
  "body": "Hi Amit,\n\nThank you for your application to the Senior Product Designer role. We were very impressed with your portfolio, particularly your work on AI-driven design systems.\n\nWe'd like to invite you to a 45-minute video interview with our design team. Please use the link below to select a time that works best for you.\n\nLooking forward to speaking with you!\n\nBest regards,\nMarcus Chen\nHead of Talent Acquisition, Coastal Technologies",
  "template_id": "tpl_interview_invite"
}
```

---

### 7.5 Export Candidates

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/recruiter/candidates/export` |
| **Description** | Export candidate pipeline data as CSV |

**Auth Required**: Yes (recruiter role)

**Request Body Schema**

```json
{
  "filters": {
    "job_id": "string (optional)",
    "department": "string (optional)",
    "status": "string (optional)",
    "min_ai_score": "number (optional)"
  },
  "columns": ["name", "email", "location", "ai_match_score", "status", "applied_to", "experience_years"]
}
```

---

### 7.6 Get AI Top Suggestion

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/recruiter/ai/top-suggestion` |
| **Description** | Get the recruiter's top AI-recommended candidate across all active postings |

**Auth Required**: Yes (recruiter role)

**Example Response Payload**

```json
{
  "candidate_id": "cand_001",
  "name": "Amit Kumar",
  "title": "Senior Product Designer",
  "experience_years": 8,
  "ai_match_score": 96,
  "available_immediately": true,
  "key_highlights": [
    "8 years of enterprise design experience",
    "Led design system migration for 3 products",
    "Expert in Figma, Design Systems, and User Research"
  ],
  "applied_to": "Senior Product Designer",
  "company": "Coastal Technologies"
}
```

---

## 8. Admin Analytics

### 8.1 Get Platform Metrics

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/admin/metrics` |
| **Description** | Retrieve high-level platform KPIs for the admin analytics dashboard |

**Auth Required**: Yes (admin role)

**Example Response Payload**

```json
{
  "total_applications": 2482,
  "total_applications_change": "+8.2%",
  "conversion_rate": 18.4,
  "conversion_rate_change": "+2.1%",
  "average_ai_score": 82,
  "average_ai_score_change": "+4 pts",
  "active_postings": 42,
  "active_postings_change": "+3",
  "total_candidates": 12847,
  "total_recruiters": 534,
  "total_hires_this_month": 312,
  "period": "last_30_days"
}
```

---

### 8.2 Get Applications Trend

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/admin/metrics/applications-trend` |
| **Description** | Retrieve daily application volume over a date range for the trend chart |

**Auth Required**: Yes (admin role)

**Query Parameters**

```
?start_date=ISO 8601 date
&end_date=ISO 8601 date
```

**Example Request**

```
GET /api/v1/admin/metrics/applications-trend?start_date=2026-04-01&end_date=2026-04-07
```

**Example Response Payload**

```json
{
  "data_points": [
    { "date": "2026-04-01", "applications": 142 },
    { "date": "2026-04-02", "applications": 178 },
    { "date": "2026-04-03", "applications": 165 },
    { "date": "2026-04-04", "applications": 210 },
    { "date": "2026-04-05", "applications": 198 },
    { "date": "2026-04-06", "applications": 245 },
    { "date": "2026-04-07", "applications": 232 }
  ],
  "total": 1370,
  "daily_average": 195.7
}
```

---

### 8.3 Get AI Score Distribution

| Field | Value |
|---|---|
| **URL** | `/api/v1/admin/metrics/ai-score-distribution` |
| **Method** | `GET` |
| **Description** | Retrieve histogram data of AI match scores across all candidates |

**Auth Required**: Yes (admin role)

**Example Response Payload**

```json
{
  "buckets": [
    { "range": "0-20", "count": 142, "percentage": 5.7 },
    { "range": "21-40", "count": 287, "percentage": 11.6 },
    { "range": "41-60", "count": 524, "percentage": 21.1 },
    { "range": "61-80", "count": 812, "percentage": 32.7 },
    { "range": "81-100", "count": 717, "percentage": 28.9 }
  ],
  "total_candidates_scored": 2482,
  "median_score": 72,
  "mean_score": 68.4
}
```

---

### 8.4 List Job Postings (Admin)

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/admin/job-postings` |
| **Description** | Retrieve all job postings across the platform with applicant counts and match rates |

**Auth Required**: Yes (admin role)

**Query Parameters**

```
?status=Active|Paused|Draft|Closed
&recruiter_id=string (optional)
&department=string (optional)
&sort_by=applicants|match_rate|date
&page=number
&limit=number
```

**Example Response Payload**

```json
{
  "job_postings": [
    {
      "id": "7f3a9c2e-4d1b-4e8a-b5c6-1a2b3c4d5e6f",
      "title": "Senior Product Designer",
      "company": "Coastal Technologies",
      "recruiter_name": "Marcus Chen",
      "department": "Design",
      "status": "Active",
      "applicant_count": 142,
      "match_rate": 87,
      "posted_at": "2026-03-15T10:00:00Z",
      "location": "San Francisco, CA"
    },
    {
      "id": "8a4b0d3f-5e2c-4f9b-c6d7-2b3c4d5e6f7a",
      "title": "Frontend Engineer",
      "company": "Lumina Systems",
      "recruiter_name": "Priya Sharma",
      "department": "Engineering",
      "status": "Active",
      "applicant_count": 98,
      "match_rate": 74,
      "posted_at": "2026-03-20T14:00:00Z",
      "location": "Remote"
    },
    {
      "id": "9b5c1e4a-6f3d-4a0c-d7e8-3c4d5e6f7a8b",
      "title": "Product Manager",
      "company": "Horizon Fintech",
      "recruiter_name": "James Wilson",
      "department": "Product",
      "status": "Paused",
      "applicant_count": 67,
      "match_rate": 65,
      "posted_at": "2026-03-10T09:30:00Z",
      "location": "New York, NY"
    },
    {
      "id": "ac6d2f5b-7a4e-4b1d-e8f9-4d5e6f7a8b9c",
      "title": "Data Scientist",
      "company": "Quantum Analytics",
      "recruiter_name": "Lin Wei",
      "department": "Data Science",
      "status": "Draft",
      "applicant_count": 45,
      "match_rate": 52,
      "posted_at": "2026-04-02T11:00:00Z",
      "location": "London, UK"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### 8.5 Update Job Posting Status (Admin)

| Field | Value |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/api/v1/admin/job-postings/:jobId` |
| **Description** | Update the status of a job posting (admin override) |

**Auth Required**: Yes (admin role)

**Request Body Schema**

```json
{
  "status": "\"Active\" | \"Paused\" | \"Draft\" | \"Closed\"",
  "admin_notes": "string (optional)"
}
```

**Example Test Payload**

```json
{
  "status": "Paused",
  "admin_notes": "Pausing due to low match rate (65%). Recommending recruiter refine requirements and adjust screening questions."
}
```

---

### 8.6 Delete Job Posting (Admin)

| Field | Value |
|---|---|
| **Method** | `DELETE` |
| **URL** | `/api/v1/admin/job-postings/:jobId` |
| **Description** | Permanently delete a job posting |

**Auth Required**: Yes (admin role)

---

### 8.7 Get Conversion Funnel

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/admin/metrics/conversion-funnel` |
| **Description** | Retrieve the recruitment funnel metrics for admin analysis |

**Auth Required**: Yes (admin role)

**Example Response Payload**

```json
{
  "funnel": [
    { "stage": "Applications", "count": 2482, "percentage": 100 },
    { "stage": "Under Review", "count": 1245, "percentage": 50.2 },
    { "stage": "Shortlisted", "count": 612, "percentage": 24.7 },
    { "stage": "Interview", "count": 338, "percentage": 13.6 },
    { "stage": "Hired", "count": 312, "percentage": 12.6 }
  ],
  "overall_conversion_rate": 18.4,
  "period": "last_30_days"
}
```

---

### 8.8 Get Recruiter Performance

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/admin/recruiters/performance` |
| **Description** | Retrieve performance metrics for all recruiters on the platform |

**Auth Required**: Yes (admin role)

**Example Response Payload**

```json
{
  "recruiters": [
    {
      "id": "rec_001",
      "name": "Marcus Chen",
      "company": "Coastal Technologies",
      "active_postings": 4,
      "total_applicants": 352,
      "avg_match_rate": 81,
      "hires_this_month": 12,
      "response_time_hours": 18
    },
    {
      "id": "rec_002",
      "name": "Priya Sharma",
      "company": "Lumina Systems",
      "active_postings": 3,
      "total_applicants": 245,
      "avg_match_rate": 76,
      "hires_this_month": 8,
      "response_time_hours": 24
    }
  ]
}
```

---

## Authentication Header Format

All authenticated requests must include:

```
Authorization: Bearer <access_token>
```

Example:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTUwZTg2NzAtZTY5Yi00YjIwLWE5YjktMjJkYjRjNTYwMjYxIiwicm9sZSI6ImNhbmRpZGF0ZSIsImV4cCI6MTc0NDAwMDAwMH0.dGVzdF9zaWduYXR1cmVfaGFzaA
```

## Common Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "password", "message": "Password must be at least 8 characters" }
    ]
  }
}
```

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource"
  }
}
```

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```
