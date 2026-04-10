import fs from "node:fs";
import path from "node:path";

import express, { type Request, type Response } from "express";
import multer from "multer";
import { MatchRecommendation } from "./src/types";
import "dotenv/config";

const PORT = Number(process.env.PORT || 3002);
const PORTAL_API_URL = process.env.PORTAL_API_URL || "http://localhost:3001/api/v1";
const RESUME_SERVICE_URL = process.env.RESUME_SERVICE_URL || "http://localhost:8000/v1";

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
) {
  return (req: Request, res: Response, next: (error?: unknown) => void) => {
    handler(req, res).catch(next);
  };
}

// ============================================================
// PROXY HELPER - forwards requests to Portal backend
// ============================================================

async function proxyToPortal(
  req: Request,
  res: Response,
  method: string,
  endpoint: string,
) {
  try {
    const url = `${PORTAL_API_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Forward auth token if present
    const authHeader = req.headers.authorization;
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (["POST", "PUT", "PATCH"].includes(method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error(`Proxy error forwarding to ${endpoint}:`, error);
    res.status(502).json({
      error: {
        code: "PROXY_ERROR",
        message: "Backend service unavailable. Ensure Portal server is running on port 3001.",
      },
    });
  }
}

// ============================================================
// RESUME SERVICE HELPER
// ============================================================

function buildResumeServiceUrl(pathname: string): string {
  const base = RESUME_SERVICE_URL.endsWith("/")
    ? RESUME_SERVICE_URL.slice(0, -1)
    : RESUME_SERVICE_URL;
  const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${safePath}`
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

function getObjectField(obj: unknown, key: string): JsonObject | undefined {
  const value = getField(obj, key);
  return isJsonObject(value) ? value : undefined;
}

function getStringField(obj: unknown, key: string): string | undefined {
  const value = getField(obj, key);
  return typeof value === "string" ? value : undefined;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
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

function coerceOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function coerceResumeCandidateType(value: unknown): "fresher" | "lateral" | undefined {
  if (value === "fresher" || value === "lateral") {
    return value;
  }
  return undefined;
}

function coerceMatchRecommendation(value: unknown): MatchRecommendation {
  if (value === MatchRecommendation.SHORTLIST) return MatchRecommendation.SHORTLIST;
  if (value === MatchRecommendation.REJECT) return MatchRecommendation.REJECT;
  if (value === MatchRecommendation.REVIEW) return MatchRecommendation.REVIEW;

  if (typeof value === "string") {
    const normalized = value.toUpperCase();
    if (normalized === "SHORTLIST") return MatchRecommendation.SHORTLIST;
    if (normalized === "REJECT") return MatchRecommendation.REJECT;
    if (normalized === "REVIEW") return MatchRecommendation.REVIEW;
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

function coerceMatchBreakdown(value: unknown): any {
  if (!isJsonObject(value)) {
    return { jd_match: {}, resume_quality: {} };
  }

  return {
    jd_match: coerceNumberRecord(value["jd_match"]),
    resume_quality: coerceNumberRecord(value["resume_quality"]),
  };
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

function getRouteParam(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

function validationError(message: string) {
  return { error: { code: "VALIDATION_ERROR", message } };
}

function notFoundError(message: string) {
  return { error: { code: "NOT_FOUND", message } };
}

// ============================================================
// AUTH HELPER - extracts current user from token via Portal API
// ============================================================

async function getCurrentUser(req: Request): Promise<any> {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${PORTAL_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch {
    return null;
  }
}

async function requireAuth(req: Request, res: Response): Promise<any | null> {
  const user = await getCurrentUser(req);
  if (!user) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
    return null;
  }
  return user;
}

// ============================================================
// SERVER SETUP
// ============================================================

async function startServer() {
  const app = express();

  // CORS
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

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      status: "ok",
      port: PORT,
      portal_api_url: PORTAL_API_URL,
      resume_service_url: RESUME_SERVICE_URL,
    });
  });

  // ============================================================
  // AUTH ENDPOINTS - Proxy to Portal
  // ============================================================

  app.post(
    "/api/v1/auth/register",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "POST", "/auth/register");
    }),
  );

  app.post(
    "/api/v1/auth/login",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "POST", "/auth/login");
    }),
  );

  app.post(
    "/api/v1/auth/refresh",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "POST", "/auth/refresh");
    }),
  );

  app.post(
    "/api/v1/auth/logout",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "POST", "/auth/logout");
    }),
  );

  app.get(
    "/api/v1/auth/me",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "GET", "/auth/me");
    }),
  );

  // ============================================================
  // PROFILE ENDPOINTS - Proxy to Portal
  // ============================================================

  app.get(
    "/api/v1/profiles/me",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "GET", "/profiles/me");
    }),
  );

  app.put(
    "/api/v1/profiles/me",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "PUT", "/profiles/me");
    }),
  );

  // ============================================================
  // JOB ENDPOINTS - Proxy to Portal
  // ============================================================

  app.get(
    "/api/v1/jobs",
    asyncHandler(async (req, res) => {
      const queryString = new URLSearchParams(req.query as any).toString();
      await proxyToPortal(req, res, "GET", `/jobs?${queryString}`);
    }),
  );

  app.get(
    "/api/v1/jobs/bookmarked",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "GET", "/jobs/bookmarked");
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
      await proxyToPortal(req, res, "GET", `/jobs/${jobId}`);
    }),
  );

  // ============================================================
  // BOOKMARK ENDPOINTS - Proxy to Portal
  // ============================================================

  app.post(
    "/api/v1/jobs/:jobId/bookmark",
    asyncHandler(async (req, res) => {
      const jobId = getRouteParam(req.params.jobId);
      if (!jobId) {
        res.status(400).json(validationError("Invalid job id."));
        return;
      }
      await proxyToPortal(req, res, "POST", `/jobs/${jobId}/bookmark`);
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
      await proxyToPortal(req, res, "DELETE", `/jobs/${jobId}/bookmark`);
    }),
  );

  // ============================================================
  // APPLICATION ENDPOINTS - Proxy to Portal
  // ============================================================

  app.post(
    "/api/v1/applications",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "POST", "/applications");
    }),
  );

  app.get(
    "/api/v1/applications/me",
    asyncHandler(async (req, res) => {
      const queryString = new URLSearchParams(req.query as any).toString();
      await proxyToPortal(req, res, "GET", `/applications/me?${queryString}`);
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
      await proxyToPortal(req, res, "GET", `/applications/${applicationId}`);
    }),
  );

  // ============================================================
  // RESUME UPLOAD - Calls resume service directly
  // ============================================================

  app.post(
    "/api/v1/resume/upload",
    resumeUpload.single("file"),
    asyncHandler(async (req, res) => {
      const user = await requireAuth(req, res);
      if (!user) return;

      const file = req.file;

      if (!file) {
        res.status(422).json(validationError("Multipart field 'file' is required."));
        return;
      }

      const candidateTypeRaw = req.body?.candidate_type;
      const candidateType = coerceResumeCandidateType(candidateTypeRaw);

      if (candidateTypeRaw !== undefined && candidateType === undefined) {
        res.status(422).json(
          validationError("Multipart field 'candidate_type' must be 'fresher' or 'lateral'.")
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
      const resumeId = `resume_${user.id}_${Date.now()}`;

      // Forward to resume_service
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
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        "Candidate";

      const normalizedResume = getObjectField(parsePayload, "normalized_resume");
      const extractedSkillsFromPayload = coerceStringArray(
        getField(normalizedResume, "skills"),
      );

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
        extracted_skills: extractedSkillsFromPayload,
        summary,
        raw: {
          source: "resume_service",
          parse_response: stripLargeResumeFields(parsePayload),
        },
        candidate_type: payloadCandidateType ?? candidateType,
        normalized_resume: normalizedResume,
        warnings: coerceStringArray(getField(parsePayload, "warnings")),
        missing_fields: coerceStringArray(getField(parsePayload, "missing_fields")),
        resume_quality: getObjectField(parsePayload, "resume_quality"),
        parser_metadata: stripExtractedText(getField(parsePayload, "parser_metadata")),
      };

      res.status(201).json({
        upload_id: uploadId,
        resume_id: resumeId,
        status: "parsed",
        parse_result: parseResult,
      });

      // Fire-and-forget: save resume_id to candidate profile
      fetch(`${PORTAL_API_URL}/profiles/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.authorization || "",
        },
        body: JSON.stringify({ resume_id: resumeId }),
      }).catch(() => {/* non-critical */});
    }),
  );

  // ============================================================
  // MATCH COMPUTE - Calls resume_service for each job from Portal
  // ============================================================

  app.post(
    "/api/v1/matches/compute",
    asyncHandler(async (req, res) => {
      const user = await requireAuth(req, res);
      if (!user) return;

      const payload = req.body as { resume_id?: string };

      if (!payload.resume_id) {
        res.status(400).json(validationError("Field 'resume_id' is required."));
        return;
      }

      // Fetch active jobs from Portal
      const jobsResponse = await fetch(`${PORTAL_API_URL}/jobs?status=active`, {
        headers: {
          Authorization: req.headers.authorization || "",
        },
      });

      if (!jobsResponse.ok) {
        res.status(502).json({
          error: { code: "PROXY_ERROR", message: "Failed to fetch jobs from Portal" },
        });
        return;
      }

      const jobsData = await jobsResponse.json();
      const jobs = jobsData.jobs || [];

      const candidateName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Candidate";

      // Try to use resume service, but fall back to mock scoring if unavailable
      const scored = await Promise.allSettled(
        jobs.map(async (job: any) => {
          try {
            const scoreResponse = await fetch(buildResumeServiceUrl("/score"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resume_id: payload.resume_id,
                job_context: {
                  job_id: job.id,
                  title: job.title,
                  description: job.description || "",
                  required_skills: job.required_skills || [],
                  preferred_skills: job.preferred_skills || [],
                  keywords: [job.department, job.type].filter(Boolean),
                  experience_min_years: job.experience_min_years,
                  experience_max_years: job.experience_max_years,
                  location: job.location,
                },
              }),
            });

            const scorePayload = await readResponsePayload(scoreResponse);

            if (!scoreResponse.ok) {
              throw new Error(resumeServiceMessage(scorePayload));
            }

            const scoreObject: JsonObject = isJsonObject(scorePayload) ? scorePayload : {};

            return {
              id: `match_${Date.now()}_${job.id}`,
              candidateName,
              resume_id: payload.resume_id,
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
              posted_at: job.posted_at || job.postedDate || new Date().toISOString(),
            };
          } catch (error) {
            throw new Error(
              `Resume service unavailable for job ${job.id}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }),
      );

      const computedMatches: any[] = [];
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
            message: failures[0] || "Resume scoring service is unavailable.",
          },
        });
        return;
      }

      computedMatches.sort((left, right) => right.jd_match_score - left.jd_match_score);

      res.json(computedMatches);
    }),
  );

  // ============================================================
  // RESUME RETRIEVAL - Proxy to resume_service or Portal
  // ============================================================

  app.get(
    "/api/v1/resume/:resumeId",
    asyncHandler(async (req, res) => {
      const resumeId = getRouteParam(req.params.resumeId);

      if (!resumeId) {
        res.status(400).json(validationError("Invalid resume id."));
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
      } catch {
        // Resume service unavailable
      }

      res.status(404).json(notFoundError("Resume not found."));
    }),
  );

  // ============================================================
  // MATCHES RETRIEVAL - Proxy to Portal
  // ============================================================

  app.get(
    "/api/v1/matches",
    asyncHandler(async (req, res) => {
      // For now, return empty - matches are computed and returned immediately
      res.json({ matches: [], total_matches: 0 });
    }),
  );

  // ============================================================
  // KNOWLEDGE FACTORY - Proxy to Portal
  // ============================================================

  app.get(
    "/api/v1/knowledge-factory/programs",
    asyncHandler(async (req, res) => {
      const queryString = new URLSearchParams(req.query as any).toString();
      await proxyToPortal(req, res, "GET", `/programs?${queryString}`);
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
      await proxyToPortal(req, res, "GET", `/programs/${programId}`);
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
      await proxyToPortal(req, res, "POST", `/programs/${programId}/apply`);
    }),
  );

  app.get(
    "/api/v1/knowledge-factory/applications/me",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "GET", "/programs/applications/me");
    }),
  );

  // ============================================================
  // INTERVIEWS - Proxy to Portal
  // ============================================================

  app.get(
    "/api/v1/interviews",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "GET", "/interviews");
    }),
  );

  app.post(
    "/api/v1/interviews",
    asyncHandler(async (req, res) => {
      await proxyToPortal(req, res, "POST", "/interviews");
    }),
  );

  app.patch(
    "/api/v1/interviews/:id",
    asyncHandler(async (req, res) => {
      const interviewId = getRouteParam(req.params.id);
      if (!interviewId) {
        res.status(400).json(validationError("Invalid interview id."));
        return;
      }
      await proxyToPortal(req, res, "PATCH", `/interviews/${interviewId}`);
    }),
  );

  // ============================================================
  // ERROR HANDLER
  // ============================================================

  app.use((error: unknown, _req: Request, res: Response, _next: unknown) => {
    const multerError = error as any;
    if (multerError.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: { code: "FILE_TOO_LARGE", message: "Resume file must be 5MB or smaller." },
      });
      return;
    }

    console.error(error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Candidate server error." },
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Candidate API proxy running on:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://10.179.189.173:${PORT}`);
    console.log(`📡 Portal API: ${PORTAL_API_URL}`);
    console.log(`📄 Resume Service: ${RESUME_SERVICE_URL}\n`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start candidate server:", error);
  process.exitCode = 1;
});
