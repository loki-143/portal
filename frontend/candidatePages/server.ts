import fs from "node:fs";
import path from "node:path";

import express, { type Request, type Response } from "express";
import multer from "multer";
import { MatchRecommendation } from "./src/types";
import {
  buildMatchInsights,
  buildProfileCompleteness,
  createAuthTokens,
  ensureCandidateDataFiles,
  extractUserIdFromToken,
  readApplications,
  readBookmarks,
  readJobs,
  readMatches,
  readProfiles,
  readProgramApplications,
  readPrograms,
  readUploads,
  readUsers,
  uploadToParseResult,
  writeApplications,
  writeBookmarks,
  writeMatches,
  writeProfiles,
  writeProgramApplications,
  writeUploads,
  writeUsers,
} from "./src/lib/dev-csv-store";
import { FALLBACK_MATCH_INSIGHTS } from "./src/lib/fallback-data";
import type {
  Application,
  CandidateProfile,
  KnowledgeFactoryApplication,
  MatchBreakdown,
  MatchResult,
  ResumeCandidateType,
} from "./src/types";

type ProcessWithLoadEnv = NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

const loadEnvFile = (process as ProcessWithLoadEnv).loadEnvFile;
if (loadEnvFile && fs.existsSync(".env")) {
  loadEnvFile(".env");
}

const PORT = Number(process.env.PORT || 3002);
const UNIFIED_API_URL = process.env.API_URL || "http://localhost:3001/api/v1";
const RESUME_SERVICE_URL = process.env.RESUME_SERVICE_URL || "http://localhost:8000/v1";

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
) {
  return (req: Request, res: Response, next: (error?: unknown) => void) => {
    handler(req, res).catch(next);
  };
}

async function startServer() {
  await ensureCandidateDataFiles();

  const app = express();

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.use(express.json({ limit: "10mb" }));

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      status: "ok",
      port: PORT,
      unified_backend_url: UNIFIED_API_URL,
      message:
        "Candidate CSV dev server is running. TODO: Replace with calls to unified backend / Supabase.",
    });
  });

  app.post(
    "/api/v1/auth/register",
    asyncHandler(async (req, res) => {
      const payload = req.body as {
        email?: string;
        password?: string;
        first_name?: string;
        last_name?: string;
        role?: string;
        phone?: string;
      };

      if (!payload.email || !payload.password || !payload.first_name || !payload.last_name) {
        res.status(400).json(validationError("Missing required auth fields."));
        return;
      }

      const users = await readUsers();
      const existingUser = users.find(
        (user) => user.email.toLowerCase() === payload.email!.toLowerCase(),
      );

      if (existingUser) {
        res.status(409).json({
          error: {
            code: "CONFLICT",
            message: "A user with this email already exists.",
          },
        });
        return;
      }

      const userId = `cand_${Date.now()}`;
      const tokens = createAuthTokens(userId);

      users.push({
        id: userId,
        email: payload.email,
        password: payload.password,
        first_name: payload.first_name,
        last_name: payload.last_name,
        role: payload.role || "candidate",
        phone: payload.phone || "",
        refresh_token: tokens.refresh_token,
      });
      await writeUsers(users);

      const profiles = await readProfiles();
      profiles.push({
        user_id: userId,
        profile: {
          id: userId,
          email: payload.email,
          role: (payload.role as CandidateProfile["role"]) || "candidate",
          first_name: payload.first_name,
          last_name: payload.last_name,
          headline: "",
          location: "",
          phone: payload.phone || "",
          bio: "",
          skills: [],
          experience_years: 0,
          education: [],
          work_preferences: {
            desired_role: "",
            preferred_locations: [],
            salary_min: 0,
            salary_max: 0,
            remote_ok: true,
            job_types: ["Full-time"],
          },
        },
      });
      await writeProfiles(profiles);

      res.status(201).json({
        ...tokens,
        user: {
          id: userId,
          email: payload.email,
          role: payload.role || "candidate",
          first_name: payload.first_name,
          last_name: payload.last_name,
          phone: payload.phone || "",
        },
      });
    }),
  );

  app.post(
    "/api/v1/auth/login",
    asyncHandler(async (req, res) => {
      const payload = req.body as { email?: string; password?: string };
      const users = await readUsers();
      const user = users.find(
        (entry) =>
          entry.email.toLowerCase() === (payload.email || "").toLowerCase() &&
          entry.password === payload.password,
      );

      if (!user) {
        res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid email or password.",
          },
        });
        return;
      }

      const tokens = createAuthTokens(user.id);
      user.refresh_token = tokens.refresh_token;
      await writeUsers(users);

      res.json({
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
        },
      });
    }),
  );

  app.post(
    "/api/v1/auth/refresh",
    asyncHandler(async (req, res) => {
      const payload = req.body as { refresh_token?: string };
      const users = await readUsers();
      const user = users.find(
        (entry) => entry.refresh_token === payload.refresh_token,
      );

      if (!user) {
        res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired refresh token.",
          },
        });
        return;
      }

      const tokens = createAuthTokens(user.id);
      user.refresh_token = tokens.refresh_token;
      await writeUsers(users);

      res.json(tokens);
    }),
  );

  app.post(
    "/api/v1/auth/logout",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const users = await readUsers();
      const matchingUser = users.find((user) => user.id === currentUser.id);

      if (matchingUser) {
        matchingUser.refresh_token = "";
        await writeUsers(users);
      }

      res.json({ message: "Logged out successfully." });
    }),
  );

  app.get(
    "/api/v1/profiles/me",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const profile = await getProfileByUserId(currentUser.id);
      res.json(profile);
    }),
  );

  app.put(
    "/api/v1/profiles/me",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const profiles = await readProfiles();
      const index = profiles.findIndex((entry) => entry.user_id === currentUser.id);
      const existing = index >= 0 ? profiles[index].profile : await getProfileByUserId(currentUser.id);

      const nextProfile: CandidateProfile = {
        ...existing,
        ...req.body,
        skills: req.body.skills || existing.skills,
        education: req.body.education || existing.education,
        work_preferences: req.body.work_preferences || existing.work_preferences,
      };

      if (index >= 0) {
        profiles[index] = { user_id: currentUser.id, profile: nextProfile };
      } else {
        profiles.push({ user_id: currentUser.id, profile: nextProfile });
      }

      await writeProfiles(profiles);
      res.json(nextProfile);
    }),
  );

  app.get(
    "/api/v1/jobs",
    asyncHandler(async (req, res) => {
      const jobs = await readJobs();
      const matches = await readMatches();
      const currentUser = await getCurrentUser(req);
      const profile = await getProfileByUserId(currentUser.id);

      const matchByJobId = new Map(
        matches
          .filter((match) => !profile.resume_id || match.resume_id === profile.resume_id)
          .map((match) => [match.jobId, match.jd_match_score]),
      );

      let filteredJobs = jobs.filter((job) => job.status === "active");

      if (typeof req.query.q === "string" && req.query.q.trim()) {
        const query = req.query.q.toLowerCase();
        filteredJobs = filteredJobs.filter((job) =>
          [job.title, job.department, job.location, job.description]
            .join(" ")
            .toLowerCase()
            .includes(query),
        );
      }

      const locationQuery = req.query.location;
      if (typeof locationQuery === "string" && locationQuery.trim()) {
        const normalizedLocation = locationQuery.toLowerCase();
        filteredJobs = filteredJobs.filter((job) =>
          job.location.toLowerCase().includes(normalizedLocation),
        );
      }

      if (typeof req.query.job_type === "string") {
        filteredJobs = filteredJobs.filter((job) => job.type === req.query.job_type);
      }

      if (typeof req.query.department === "string") {
        filteredJobs = filteredJobs.filter(
          (job) => job.department === req.query.department,
        );
      }

      if (req.query.remote_only === "true") {
        filteredJobs = filteredJobs.filter((job) => job.remote_ok);
      }

      if (typeof req.query.salary_min === "string") {
        const salaryMin = Number(req.query.salary_min);
        filteredJobs = filteredJobs.filter(
          (job) => (job.salary_max || 0) >= salaryMin,
        );
      }

      if (typeof req.query.salary_max === "string") {
        const salaryMax = Number(req.query.salary_max);
        filteredJobs = filteredJobs.filter(
          (job) => (job.salary_min || 0) <= salaryMax,
        );
      }

      const sortBy = typeof req.query.sort_by === "string" ? req.query.sort_by : "relevance";
      filteredJobs = filteredJobs.sort((left, right) => {
        if (sortBy === "salary") {
          return (right.salary_max || 0) - (left.salary_max || 0);
        }

        if (sortBy === "date") {
          return Date.parse(right.postedDate) - Date.parse(left.postedDate);
        }

        return (matchByJobId.get(right.id) || 0) - (matchByJobId.get(left.id) || 0);
      });

      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.max(Number(req.query.limit || 20), 1);
      const startIndex = (page - 1) * limit;
      const paginatedJobs = filteredJobs.slice(startIndex, startIndex + limit);

      res.json({
        jobs: paginatedJobs.map((job) => ({
          ...job,
          match_score: matchByJobId.get(job.id) || job.match_score || 0,
        })),
        total: filteredJobs.length,
        page,
        limit,
      });
    }),
  );

  app.get(
    "/api/v1/jobs/bookmarked",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const jobs = await readJobs();
      const bookmarks = await readBookmarks();
      const bookmarkedIds = bookmarks
        .filter((bookmark) => bookmark.user_id === currentUser.id)
        .map((bookmark) => bookmark.job_id);

      res.json({
        jobs: jobs.filter((job) => bookmarkedIds.includes(job.id)),
      });
    }),
  );

  app.get(
    "/api/v1/jobs/:jobId",
    asyncHandler(async (req, res) => {
      const jobId = getRouteParam(req.params.jobId);
      if (!jobId) {
        res.status(400).json(validationError("Invalid job id."));
        return;
      }

      const jobs = await readJobs();
      const matches = await readMatches();
      const currentUser = await getCurrentUser(req);
      const profile = await getProfileByUserId(currentUser.id);
      const job = jobs.find((entry) => entry.id === jobId);

      if (!job) {
        res.status(404).json(notFoundError("Job not found."));
        return;
      }

      const matchedJob = matches.find(
        (match) =>
          match.jobId === job.id &&
          (!profile.resume_id || match.resume_id === profile.resume_id),
      );

      res.json({
        ...job,
        match_score: matchedJob?.jd_match_score || 0,
      });
    }),
  );

  app.post(
    "/api/v1/jobs/:jobId/bookmark",
    asyncHandler(async (req, res) => {
      const jobId = getRouteParam(req.params.jobId);
      if (!jobId) {
        res.status(400).json(validationError("Invalid job id."));
        return;
      }

      const currentUser = await getCurrentUser(req);
      const bookmarks = await readBookmarks();
      const exists = bookmarks.some(
        (bookmark) =>
          bookmark.user_id === currentUser.id &&
          bookmark.job_id === jobId,
      );

      if (!exists) {
        bookmarks.push({
          id: `bookmark_${Date.now()}`,
          user_id: currentUser.id,
          job_id: jobId,
          created_at: new Date().toISOString(),
        });
        await writeBookmarks(bookmarks);
      }

      res.json({
        success: true,
        bookmarks: bookmarks
          .filter((bookmark) => bookmark.user_id === currentUser.id)
          .map((bookmark) => bookmark.job_id),
      });
    }),
  );

  app.delete(
    "/api/v1/jobs/:jobId/bookmark",
    asyncHandler(async (req, res) => {
      const jobId = getRouteParam(req.params.jobId);
      if (!jobId) {
        res.status(400).json(validationError("Invalid job id."));
        return;
      }

      const currentUser = await getCurrentUser(req);
      const bookmarks = await readBookmarks();
      const filtered = bookmarks.filter(
        (bookmark) =>
          !(
            bookmark.user_id === currentUser.id &&
            bookmark.job_id === jobId
          ),
      );
      await writeBookmarks(filtered);

      res.json({
        success: true,
        bookmarks: filtered
          .filter((bookmark) => bookmark.user_id === currentUser.id)
          .map((bookmark) => bookmark.job_id),
      });
    }),
  );

  app.post(
    "/api/v1/applications",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const jobs = await readJobs();
      const applications = await readApplications();
      const job = jobs.find((entry) => entry.id === req.body.job_id);

      if (!job) {
        res.status(404).json(notFoundError("Cannot apply to a missing job."));
        return;
      }

      const appliedAt = new Date().toISOString();
      const application: Application = {
        id: `app_${Date.now()}`,
        job_id: job.id,
        job_title: job.title,
        company_name: job.company_name,
        location: job.location,
        status: "Applied",
        applied_at: appliedAt,
        resume_url: req.body.resume_url,
        cover_letter: req.body.cover_letter,
        portfolio_url: req.body.portfolio_url,
        answers_to_screening_questions:
          req.body.answers_to_screening_questions || [],
        timeline: [
          {
            status: "Applied",
            changed_at: appliedAt,
          },
        ],
      };

      applications.push({ user_id: currentUser.id, application });
      await writeApplications(applications);

      res.status(201).json(application);
    }),
  );

  app.get(
    "/api/v1/applications/me",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const applications = await readApplications();

      let filtered = applications
        .filter((entry) => entry.user_id === currentUser.id)
        .map((entry) => entry.application);

      if (typeof req.query.status === "string") {
        filtered = filtered.filter((application) => application.status === req.query.status);
      }

      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.max(Number(req.query.limit || 20), 1);
      const startIndex = (page - 1) * limit;

      res.json({
        applications: filtered.slice(startIndex, startIndex + limit),
        total: filtered.length,
        page,
        limit,
      });
    }),
  );

  app.get(
    "/api/v1/applications/:applicationId",
    asyncHandler(async (req, res) => {
      const applicationId = getRouteParam(req.params.applicationId);
      if (!applicationId) {
        res.status(400).json(validationError("Invalid application id."));
        return;
      }

      const currentUser = await getCurrentUser(req);
      const applications = await readApplications();
      const application = applications.find(
        (entry) =>
          entry.user_id === currentUser.id &&
          entry.application.id === applicationId,
      );

      if (!application) {
        res.status(404).json(notFoundError("Application not found."));
        return;
      }

      res.json(application.application);
    }),
  );

  app.post(
    "/api/v1/resume/upload",
    resumeUpload.single("file"),
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const profile = await getProfileByUserId(currentUser.id);
      const uploads = await readUploads();

      const file = req.file;

      if (!file) {
        res.status(422).json(validationError("Multipart field 'file' is required."));
        return;
      }

      const candidateTypeRaw = req.body?.candidate_type;
      const candidateType = coerceResumeCandidateType(candidateTypeRaw);

      if (
        candidateTypeRaw !== undefined &&
        candidateType === undefined
      ) {
        res
          .status(422)
          .json(
            validationError(
              "Multipart field 'candidate_type' must be 'fresher' or 'lateral'.",
            ),
          );
        return;
      }

      const extension = path.extname(file.originalname).toLowerCase();
      if (extension !== ".pdf" && extension !== ".docx") {
        res.status(422).json({
          error: {
            code: "UNSUPPORTED_FILE_TYPE",
            message: "Only PDF or DOCX resumes are supported.",
          },
        });
        return;
      }

      const uploadId = `upload_${Date.now()}`;
      const resumeId =
        profile.resume_id || `cand_${currentUser.id || "anon"}_${Date.now()}`;

      const formData = new FormData();
      const blob = new Blob([new Uint8Array(file.buffer)], {
        type: file.mimetype || "application/octet-stream",
      });
      formData.append("file", blob, file.originalname);
      formData.append("resume_id", resumeId);
      if (candidateType) {
        formData.append("candidate_type", candidateType);
      }

      const parseResponse = await fetch(buildResumeServiceUrl("/parse"), {
        method: "POST",
        body: formData,
      });

      const parsePayload = await readResponsePayload(parseResponse);

      if (!parseResponse.ok) {
        res.status(parseResponse.status).json({
          error: {
            code: "RESUME_SERVICE_ERROR",
            message: resumeServiceMessage(parsePayload),
          },
        });
        return;
      }

      const candidateName =
        getStringField(getObjectField(parsePayload, "normalized_resume"), "full_name") ||
        `${profile.first_name} ${profile.last_name}`.trim() ||
        "Candidate";

      const normalizedResume = getObjectField(parsePayload, "normalized_resume");
      const extractedSkillsFromPayload = coerceStringArray(
        getField(normalizedResume, "skills"),
      );
      const extractedSkills =
        extractedSkillsFromPayload.length > 0
          ? extractedSkillsFromPayload
          : profile.skills;

      const qualitySummary = getStringField(getObjectField(parsePayload, "resume_quality"), "summary");
      const experienceSummary = getStringField(normalizedResume, "experience_summary");
      const summary =
        typeof qualitySummary === "string" && qualitySummary.trim()
          ? qualitySummary
          : typeof experienceSummary === "string" && experienceSummary.trim()
            ? experienceSummary
            : "Resume parsed successfully.";

      const payloadCandidateType = coerceResumeCandidateType(
        getField(parsePayload, "candidate_type"),
      );

      const parseResult = {
        upload_id: uploadId,
        resume_id: resumeId,
        status: "parsed",
        candidate_name: candidateName,
        extracted_skills: extractedSkills,
        summary,
        raw: {
          source: "resume_service",
          unified_backend_url: UNIFIED_API_URL,
          parse_response: stripLargeResumeFields(parsePayload),
        },
        candidate_type: payloadCandidateType ?? candidateType,
        normalized_resume: normalizedResume,
        warnings: coerceStringArray(getField(parsePayload, "warnings")),
        missing_fields: coerceStringArray(getField(parsePayload, "missing_fields")),
        resume_quality: getObjectField(parsePayload, "resume_quality"),
        parser_metadata: stripExtractedText(getField(parsePayload, "parser_metadata")),
      };

      uploads.push({
        user_id: currentUser.id,
        upload_id: uploadId,
        resume_id: resumeId,
        status: "parsed",
        candidate_name: parseResult.candidate_name,
        extracted_skills: parseResult.extracted_skills,
        summary: parseResult.summary,
        raw: parseResult.raw,
        created_at: new Date().toISOString(),
      });
      await writeUploads(uploads);

      if (!profile.resume_id) {
        const profiles = await readProfiles();
        const index = profiles.findIndex((entry) => entry.user_id === currentUser.id);
        if (index >= 0) {
          profiles[index] = {
            user_id: currentUser.id,
            profile: {
              ...profiles[index].profile,
              resume_id: resumeId,
            },
          };
          await writeProfiles(profiles);
        }
      }

      res.status(201).json({
        upload_id: uploadId,
        resume_id: resumeId,
        status: "parsed",
        parse_result: parseResult,
      });
    }),
  );

  app.post(
    "/api/v1/matches/compute",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const profile = await getProfileByUserId(currentUser.id);
      const payload = req.body as { resume_id?: string };

      if (!payload.resume_id) {
        res.status(400).json(validationError("Field 'resume_id' is required."));
        return;
      }

      if (profile.resume_id && profile.resume_id !== payload.resume_id) {
        res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Resume does not belong to the current profile.",
          },
        });
        return;
      }

      const resumeId = payload.resume_id;

      const jobs = (await readJobs()).filter((job) => job.status === "active");
      const candidateName =
        `${profile.first_name} ${profile.last_name}`.trim() || "Candidate";

      const scored = await Promise.allSettled(
        jobs.map(async (job) => {
          const { min, max } = inferExperienceRange(job.title);
          const scoreResponse = await fetch(buildResumeServiceUrl("/score"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resume_id: resumeId,
              job_context: {
                job_id: job.id,
                title: job.title,
                description: job.description,
                required_skills: job.matched_tags || [],
                preferred_skills: [],
                keywords: [job.department, job.type].filter(Boolean),
                experience_min_years: min,
                experience_max_years: max,
                location: job.location,
              },
            }),
          });

          const scorePayload = await readResponsePayload(scoreResponse);

          if (!scoreResponse.ok) {
            throw new Error(resumeServiceMessage(scorePayload));
          }

          const scoreObject: JsonObject = isJsonObject(scorePayload)
            ? scorePayload
            : {};

          const match: MatchResult = {
            id: `match_${Date.now()}_${job.id}`,
            candidateName,
            resume_id: resumeId,
            jobId: job.id,
            jobTitle: job.title,
            jd_match_score: coerceNumber(scoreObject["jd_match_score"], 0),
            resume_quality_score: coerceNumber(scoreObject["resume_quality_score"], 0),
            breakdown: coerceMatchBreakdown(scoreObject["breakdown"]),
            matched_skills: coerceStringArray(scoreObject["matched_skills"]),
            missing_skills: coerceStringArray(scoreObject["missing_skills"]),
            recommendation: coerceMatchRecommendation(scoreObject["recommendation"]),
            summary: coerceOptionalString(scoreObject["summary"]),
            company_name: job.company_name,
            location: job.location,
            job_type: job.type,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            salary_period: job.salary_period,
            posted_at: `${job.postedDate}T10:00:00Z`,
          };

          return match;
        }),
      );

      const computedMatches: MatchResult[] = [];
      const failures: string[] = [];

      scored.forEach((result) => {
        if (result.status === "fulfilled") {
          computedMatches.push(result.value);
        } else {
          failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
        }
      });

      if (computedMatches.length === 0) {
        res.status(503).json({
          error: {
            code: "RESUME_SERVICE_UNAVAILABLE",
            message:
              failures[0] ||
              "Resume scoring service is unavailable. Ensure resume_service is running on http://localhost:8000.",
          },
        });
        return;
      }

      computedMatches.sort((left, right) => right.jd_match_score - left.jd_match_score);

      const existingMatches = await readMatches();
      const nextMatches = existingMatches.filter(
        (match) => match.resume_id !== resumeId,
      );
      nextMatches.push(...computedMatches);
      await writeMatches(nextMatches);

      res.json(computedMatches);
    }),
  );

  app.get(
    "/api/v1/resume/:resumeId",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const profile = await getProfileByUserId(currentUser.id);
      const resumeId = getRouteParam(req.params.resumeId);

      if (!resumeId) {
        res.status(400).json(validationError("Invalid resume id."));
        return;
      }

      if (profile.resume_id && profile.resume_id !== resumeId) {
        res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Resume does not belong to the current profile.",
          },
        });
        return;
      }

      try {
        const response = await fetch(
          buildResumeServiceUrl(`/resumes/${encodeURIComponent(resumeId)}`),
        );
        const payload = await readResponsePayload(response);

        if (response.ok) {
          res.json(stripLargeResumeFields(payload));
          return;
        }

        // If resume_service is up but resume is missing, fall through to CSV lookup.
      } catch {
        // Resume service unavailable; fall back to last uploaded parse payload stored in CSV.
      }

      const uploads = await readUploads();
      const mostRecent = uploads
        .filter((entry) => entry.user_id === currentUser.id && entry.resume_id === resumeId)
        .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))[0];

      if (!mostRecent) {
        res.status(404).json(notFoundError("Resume not found."));
        return;
      }

      const parseResult = uploadToParseResult(mostRecent);
      const storedParseResponse = mostRecent.raw.parse_response;
      const storedParseObject = isJsonObject(storedParseResponse)
        ? storedParseResponse
        : undefined;
      const storedNormalizedResume = storedParseObject?.["normalized_resume"];
      const storedResumeQuality = storedParseObject?.["resume_quality"];
      const storedParserMetadata = storedParseObject?.["parser_metadata"];
      const storedCandidateType = storedParseObject?.["candidate_type"];
      const normalizedResume =
        (isJsonObject(storedNormalizedResume) ? storedNormalizedResume : undefined) ||
        parseResult.normalized_resume || {
          full_name: parseResult.candidate_name,
          emails: [],
          phones: [],
          current_location: null,
          links: [],
          skills: parseResult.extracted_skills,
          skill_evidence: [],
          experience_summary: parseResult.summary,
          employment_history: [],
          education: [],
          projects: [],
          certifications: [],
          current_role: null,
          full_time_months: 0,
          internship_months: 0,
          total_relevant_months: 0,
          notice_period: null,
          current_ctc: null,
          expected_ctc: null,
          preferred_location: null,
          work_authorization: null,
        };
      const resumeQuality =
        (isJsonObject(storedResumeQuality) ? storedResumeQuality : undefined) ||
        parseResult.resume_quality || {
          score: 0,
          breakdown: {},
          recommendation: "",
          summary: parseResult.summary,
        };
      const parserMetadata =
        stripExtractedText(
          (isJsonObject(storedParserMetadata) ? storedParserMetadata : undefined) ||
            parseResult.parser_metadata,
        ) || {
          filename: "resume",
          file_type: "unknown",
          content_type: null,
          file_size_bytes: 0,
          line_count: 0,
          page_count: 1,
          extractor_name: null,
          section_order: [],
          detected_columns: 1,
          is_scanned: false,
          content_fingerprint: null,
          sensitive_findings: [],
        };

      const resolvedCandidateType: ResumeCandidateType =
        coerceResumeCandidateType(storedCandidateType) ||
        parseResult.candidate_type ||
        "lateral";
      res.json({
        resume_id: resumeId,
        candidate_type: resolvedCandidateType,
        normalized_resume: normalizedResume,
        resume_quality: resumeQuality,
        parser_metadata: parserMetadata,
        created_at: mostRecent.created_at,
        updated_at: mostRecent.created_at,
      });
    }),
  );

  app.get(
    "/api/v1/resume/:uploadId/parse-result",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const uploads = await readUploads();
      const uploadId = getRouteParam(req.params.uploadId);

      if (!uploadId) {
        res.status(400).json(validationError("Invalid upload id."));
        return;
      }

      const upload = uploads.find(
        (entry) =>
          entry.user_id === currentUser.id &&
          entry.upload_id === uploadId,
      );

      if (!upload) {
        res.status(404).json(notFoundError("Resume parse result not found."));
        return;
      }

      res.json(uploadToParseResult(upload));
    }),
  );

  app.get(
    "/api/v1/matches",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const profile = await getProfileByUserId(currentUser.id);
      const matches = await readMatches();
      const filteredMatches = matches
        .filter((match) => !profile.resume_id || match.resume_id === profile.resume_id)
        .filter((match) => {
          if (typeof req.query.min_match_score !== "string") {
            return true;
          }

          return match.jd_match_score >= Number(req.query.min_match_score);
        })
        .sort((left, right) => right.jd_match_score - left.jd_match_score);

      const limit = Math.max(Number(req.query.limit || 10), 1);

      res.json({
        matches: filteredMatches.slice(0, limit),
        total_matches: filteredMatches.length,
        profile_completeness: buildProfileCompleteness(profile),
      });
    }),
  );

  app.get(
    "/api/v1/matches/insights",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const profile = await getProfileByUserId(currentUser.id);
      const matches = await readMatches();
      const profileMatches = matches.filter(
        (match) => !profile.resume_id || match.resume_id === profile.resume_id,
      );

      res.json(
        profileMatches.length > 0
          ? buildMatchInsights(profileMatches)
          : FALLBACK_MATCH_INSIGHTS,
      );
    }),
  );

  app.get(
    "/api/v1/knowledge-factory/programs",
    asyncHandler(async (req, res) => {
      let programs = await readPrograms();

      if (typeof req.query.category === "string") {
        programs = programs.filter(
          (program) => program.category === req.query.category,
        );
      }

      if (typeof req.query.enrollment_status === "string") {
        programs = programs.filter(
          (program) => program.status === req.query.enrollment_status,
        );
      }

      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.max(Number(req.query.limit || 20), 1);
      const startIndex = (page - 1) * limit;

      res.json({
        programs: programs.slice(startIndex, startIndex + limit),
        total: programs.length,
        page,
        limit,
      });
    }),
  );

  app.get(
    "/api/v1/knowledge-factory/programs/:programId",
    asyncHandler(async (req, res) => {
      const programId = getRouteParam(req.params.programId);
      if (!programId) {
        res.status(400).json(validationError("Invalid program id."));
        return;
      }

      const programs = await readPrograms();
      const program = programs.find((entry) => entry.id === programId);

      if (!program) {
        res.status(404).json(notFoundError("Program not found."));
        return;
      }

      res.json(program);
    }),
  );

  app.post(
    "/api/v1/knowledge-factory/programs/:programId/apply",
    asyncHandler(async (req, res) => {
      const programId = getRouteParam(req.params.programId);
      if (!programId) {
        res.status(400).json(validationError("Invalid program id."));
        return;
      }

      const currentUser = await getCurrentUser(req);
      const programs = await readPrograms();
      const applications = await readProgramApplications();
      const program = programs.find((entry) => entry.id === programId);

      if (!program) {
        res.status(404).json(notFoundError("Program not found."));
        return;
      }

      const application: KnowledgeFactoryApplication = {
        id: `kfa_${Date.now()}`,
        program_id: program.id,
        program_name: program.name,
        full_name: req.body.full_name,
        email: req.body.email,
        phone: req.body.phone,
        university: req.body.university,
        linkedin_url: req.body.linkedin_url,
        resume_url: req.body.resume_url,
        statement_of_purpose: req.body.statement_of_purpose,
        status: "Submitted",
        submitted_at: new Date().toISOString(),
      };

      applications.push({ user_id: currentUser.id, application });
      await writeProgramApplications(applications);

      res.status(201).json(application);
    }),
  );

  app.get(
    "/api/v1/knowledge-factory/applications/me",
    asyncHandler(async (req, res) => {
      const currentUser = await getCurrentUser(req);
      const applications = await readProgramApplications();

      res.json({
        applications: applications
          .filter((entry) => entry.user_id === currentUser.id)
          .map((entry) => entry.application),
      });
    }),
  );

  app.use((error: unknown, _req: Request, res: Response, _next: unknown) => {
    if (isMulterFileSizeError(error)) {
      res.status(413).json({
        error: {
          code: "FILE_TOO_LARGE",
          message: "Resume file must be 5MB or smaller.",
        },
      });
      return;
    }

    console.error(error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong in the candidate CSV dev server.",
      },
    });
  });

  app.listen(PORT, () => {
    console.log(`Candidate CSV dev server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function getCurrentUser(req: Request) {
  const users = await readUsers();
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;
  const userId = extractUserIdFromToken(token) || users[0]?.id;
  const user = users.find((entry) => entry.id === userId) || users[0];

  if (!user) {
    throw new Error("Candidate dev server has no seeded users.");
  }

  return user;
}

async function getProfileByUserId(userId: string): Promise<CandidateProfile> {
  const profiles = await readProfiles();
  const profile = profiles.find((entry) => entry.user_id === userId)?.profile;

  if (!profile) {
    throw new Error(`Missing profile for user ${userId}`);
  }

  return profile;
}

function notFoundError(message: string) {
  return {
    error: {
      code: "NOT_FOUND",
      message,
    },
  };
}

function validationError(message: string) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  };
}

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getField(obj: unknown, key: string): unknown {
  if (!isJsonObject(obj)) {
    return undefined;
  }

  return obj[key];
}

function getRouteParam(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return null;
}

function getObjectField(obj: unknown, key: string): JsonObject | undefined {
  const value = getField(obj, key);
  return isJsonObject(value) ? value : undefined;
}

function getStringField(obj: unknown, key: string): string | undefined {
  const value = getField(obj, key);
  return typeof value === "string" ? value : undefined;
}

function coerceOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function coerceNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function coerceResumeCandidateType(value: unknown): ResumeCandidateType | undefined {
  if (value === "fresher" || value === "lateral") {
    return value;
  }

  return undefined;
}

function coerceMatchRecommendation(value: unknown): MatchRecommendation {
  if (value === MatchRecommendation.SHORTLIST) {
    return MatchRecommendation.SHORTLIST;
  }

  if (value === MatchRecommendation.REJECT) {
    return MatchRecommendation.REJECT;
  }

  if (value === MatchRecommendation.REVIEW) {
    return MatchRecommendation.REVIEW;
  }

  if (typeof value === "string") {
    const normalized = value.toUpperCase();
    if (normalized === MatchRecommendation.SHORTLIST) {
      return MatchRecommendation.SHORTLIST;
    }
    if (normalized === MatchRecommendation.REJECT) {
      return MatchRecommendation.REJECT;
    }
  }

  return MatchRecommendation.REVIEW;
}

function coerceNumberRecord(value: unknown): Record<string, number> {
  if (!isJsonObject(value)) {
    return {};
  }

  const entries: Array<[string, number]> = [];

  Object.entries(value).forEach(([key, entry]) => {
    const parsed = coerceNumber(entry, Number.NaN);
    if (Number.isFinite(parsed)) {
      entries.push([key, parsed]);
    }
  });

  return Object.fromEntries(entries);
}

function coerceMatchBreakdown(value: unknown): MatchBreakdown {
  if (!isJsonObject(value)) {
    return { jd_match: {}, resume_quality: {} };
  }

  return {
    jd_match: coerceNumberRecord(value["jd_match"]),
    resume_quality: coerceNumberRecord(value["resume_quality"]),
  };
}

function buildResumeServiceUrl(pathname: string): string {
  const base = RESUME_SERVICE_URL.endsWith("/")
    ? RESUME_SERVICE_URL.slice(0, -1)
    : RESUME_SERVICE_URL;
  const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${safePath}`;
}

async function readResponsePayload(response: globalThis.Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch {
    return null;
  }
}

function resumeServiceMessage(payload: unknown): string {
  if (!payload) {
    return "Resume service request failed.";
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (!isJsonObject(payload)) {
    return "Resume service request failed.";
  }

  const errorValue = payload["error"];
  if (isJsonObject(errorValue) && typeof errorValue["message"] === "string") {
    return errorValue["message"];
  }

  if (typeof payload["message"] === "string") {
    return payload["message"];
  }

  if (typeof payload["detail"] === "string") {
    return payload["detail"];
  }

  return "Resume service request failed.";
}

function stripExtractedText(parserMetadata: unknown): unknown {
  if (!parserMetadata || typeof parserMetadata !== "object") {
    return parserMetadata;
  }

  const cloned = { ...(parserMetadata as Record<string, unknown>) };
  if (typeof cloned.extracted_text === "string") {
    delete cloned.extracted_text;
  }
  return cloned;
}

function stripLargeResumeFields(payload: unknown): unknown {
  if (!isJsonObject(payload)) {
    return payload;
  }

  const cloned = structuredClone(payload);

  if ("resume_text" in cloned) {
    delete cloned.resume_text;
  }

  if (isJsonObject(cloned["parser_metadata"])) {
    cloned["parser_metadata"] = stripExtractedText(cloned["parser_metadata"]);
  }
  return cloned;
}

function inferExperienceRange(jobTitle: string): { min: number | null; max: number | null } {
  const title = jobTitle.toLowerCase();

  if (title.includes("intern")) {
    return { min: 0, max: 1 };
  }
  if (title.includes("junior") || title.includes("associate")) {
    return { min: 0, max: 3 };
  }
  if (title.includes("senior") || title.includes("lead") || title.includes("principal")) {
    return { min: 4, max: 12 };
  }

  return { min: 1, max: 8 };
}

function isMulterFileSizeError(error: unknown): boolean {
  if (!isJsonObject(error)) {
    return false;
  }

  return error["code"] === "LIMIT_FILE_SIZE";
}
