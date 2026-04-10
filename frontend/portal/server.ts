import express, { Request, Response, NextFunction } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || "portal_dev_jwt_secret_change_in_production";
const JWT_EXPIRES_IN = "7d";
const REFRESH_TOKEN_EXPIRES_IN = "30d";
const BCRYPT_ROUNDS = 12;

// Supabase client - falls back to CSV mode if not configured
let supabase: SupabaseClient | null = null;
let useCsvFallback = false;

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  console.log("✅ Supabase client initialized");
} else {
  console.warn("⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Using CSV fallback mode.");
  console.warn("    Set these env vars in .env file to enable database mode.");
  useCsvFallback = true;
}

// ============================================================
// CSV FALLBACK HELPERS (for dev mode without Supabase)
// ============================================================

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function parseCsvFile(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n").filter(l => l.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCsvLine(lines[0]);
  const records: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || "";
    });
    records.push(record);
  }
  
  return records;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ============================================================
// TYPE DEFINITIONS
// ============================================================

type UserRole = "superadmin" | "admin" | "recruiter" | "candidate";
type UserStatus = "active" | "disabled" | "inactive";
type JobStatus = "draft" | "active" | "closed";
type ApplicationStatus =
  | "Applied"
  | "Under Review"
  | "Shortlisted"
  | "Interview Scheduled"
  | "Interview Completed"
  | "Offered"
  | "Hired"
  | "Rejected"
  | "Withdrawn";

interface AuthUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

// ============================================================
// APP SETUP
// ============================================================

async function startServer() {
  const app = express();

  app.use(cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
    ],
    credentials: true,
  }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  ensureDataDir();

  // ============================================================
  // AUTH HELPERS
  // ============================================================

  function generateToken(userId: string, role: UserRole, expiresIn: string): string {
    return jwt.sign(
      { userId, role },
      JWT_SECRET,
      { expiresIn }
    );
  }

  function generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: "refresh" },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
  }

  function verifyToken(token: string): { userId: string; role: UserRole } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string; role: UserRole };
    } catch {
      return null;
    }
  }

  function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  function sanitizeUser(user: any): AuthUser {
    const { password_hash, refresh_token, ...rest } = user;
    return rest;
  }

  function getBearerToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header || typeof header !== "string") return null;
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return null;
    return token;
  }

  // ============================================================
  // MIDDLEWARE
  // ============================================================

  async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
        return;
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
        return;
      }

      // Fetch user from database
      let user: any = null;
      if (supabase && !useCsvFallback) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", decoded.userId)
          .single();
        user = data;
      }

      if (!user) {
        // CSV fallback: find user by ID in CSV
        const users = parseCsvFile(path.join(DATA_DIR, "users.csv"));
        const csvUser = users.find(u => u.id === decoded.userId);
        if (!csvUser) {
          res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found" } });
          return;
        }
        user = {
          id: csvUser.id,
          email: csvUser.email,
          first_name: csvUser.first_name || null,
          last_name: csvUser.last_name || null,
          phone: csvUser.phone || null,
          role: csvUser.role,
          status: csvUser.status || "active",
        };
      }

      if (user.status !== "active") {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "User account is not active" } });
        return;
      }

      req.user = sanitizeUser(user);
      next();
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  }

  function requireRole(...roles: UserRole[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
        return;
      }
      if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
        return;
      }
      next();
    };
  }

  // ============================================================
  // AUTH ENDPOINTS
  // ============================================================

  app.post("/api/v1/auth/register", async (req, res) => {
    try {
      const { email, password, first_name, last_name, phone, role = "candidate" } = req.body;

      if (!email || !password || !first_name || !last_name) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Missing required fields: email, password, first_name, last_name" } });
        return;
      }

      const validRoles: UserRole[] = ["admin", "recruiter", "candidate"];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid role" } });
        return;
      }

      // Check if user exists
      if (supabase && !useCsvFallback) {
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .ilike("email", email)
          .single();

        if (existing) {
          res.status(409).json({ error: { code: "CONFLICT", message: "User with this email already exists" } });
          return;
        }

        const passwordHash = await hashPassword(password);

        const { data: newUser, error } = await supabase
          .from("users")
          .insert({
            email: email.toLowerCase().trim(),
            password_hash: passwordHash,
            first_name,
            last_name,
            phone: phone || null,
            role,
            status: "active",
          })
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        // Create candidate profile if role is candidate
        if (role === "candidate") {
          await supabase
            .from("candidate_profiles")
            .insert({
              user_id: newUser.id,
              skills: [],
              experience_years: 0,
              education: [],
              work_preferences: {},
            });
        }

        const accessToken = generateToken(newUser.id, newUser.role, JWT_EXPIRES_IN);
        const refreshToken = generateRefreshToken(newUser.id);

        // Store refresh token
        await supabase
          .from("users")
          .update({ refresh_token: refreshToken })
          .eq("id", newUser.id);

        res.status(201).json({
          access_token: accessToken,
          refresh_token: refreshToken,
          user: sanitizeUser(newUser),
        });
      } else {
        // CSV fallback mode
        const usersFile = path.join(DATA_DIR, "users.csv");
        const users = parseCsvFile(usersFile);
        const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

        if (existing) {
          res.status(409).json({ error: { code: "CONFLICT", message: "User with this email already exists" } });
          return;
        }

        const passwordHash = await hashPassword(password);
        const userId = crypto.randomUUID();

        users.push({
          id: userId,
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          first_name,
          last_name,
          phone: phone || "",
          role,
          status: "active",
          refresh_token: "",
        });

        // Write back to CSV (simplified - no proper CSV writer in fallback)
        // In production, always use Supabase
        const accessToken = generateToken(userId, role as UserRole, JWT_EXPIRES_IN);
        const refreshToken = generateRefreshToken(userId);

        res.status(201).json({
          access_token: accessToken,
          refresh_token: refreshToken,
          user: {
            id: userId,
            email: email.toLowerCase().trim(),
            first_name,
            last_name,
            phone: phone || null,
            role,
            status: "active",
          },
        });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.post("/api/v1/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Email and password are required" } });
        return;
      }

      let user: any = null;

      if (supabase && !useCsvFallback) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .ilike("email", email.trim())
          .single();
        user = data;
      }

      if (!user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
        return;
      }

      const validPassword = await verifyPassword(password, user.password_hash);
      if (!validPassword) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
        return;
      }

      if (user.status !== "active") {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "User account is not active" } });
        return;
      }

      const accessToken = generateToken(user.id, user.role, JWT_EXPIRES_IN);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token
      if (supabase && !useCsvFallback) {
        await supabase
          .from("users")
          .update({ refresh_token: refreshToken })
          .eq("id", user.id);
      }

      res.json({
        access_token: accessToken,
        refresh_token: refreshToken,
        user: sanitizeUser(user),
      });
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.post("/api/v1/auth/refresh", async (req, res) => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Refresh token is required" } });
        return;
      }

      const decoded = verifyToken(refresh_token);
      if (!decoded || (decoded as any).type !== "refresh") {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid refresh token" } });
        return;
      }

      let user: any = null;

      if (supabase && !useCsvFallback) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", decoded.userId)
          .single();
        user = data;
      }

      if (!user || user.refresh_token !== refresh_token) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid refresh token" } });
        return;
      }

      const newAccessToken = generateToken(user.id, user.role, JWT_EXPIRES_IN);
      const newRefreshToken = generateRefreshToken(user.id);

      if (supabase && !useCsvFallback) {
        await supabase
          .from("users")
          .update({ refresh_token: newRefreshToken })
          .eq("id", user.id);
      }

      res.json({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      });
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.post("/api/v1/auth/logout", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (supabase && !useCsvFallback) {
        await supabase
          .from("users")
          .update({ refresh_token: null })
          .eq("id", req.user!.id);
      }

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.get("/api/v1/auth/me", requireAuth, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // ============================================================
  // PROFILE ENDPOINTS
  // ============================================================

  app.get("/api/v1/profiles/me", requireAuth, requireRole("candidate"), async (req: AuthRequest, res) => {
    try {
      if (supabase && !useCsvFallback) {
        const { data } = await supabase
          .from("candidate_profiles")
          .select("*")
          .eq("user_id", req.user!.id)
          .single();

        if (!data) {
          res.status(404).json({ error: { code: "NOT_FOUND", message: "Profile not found" } });
          return;
        }

        res.json({ ...data, user: req.user });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Profile endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.put("/api/v1/profiles/me", requireAuth, requireRole("candidate"), async (req: AuthRequest, res) => {
    try {
      const { headline, location, bio, skills, experience_years, education, work_preferences, resume_id } = req.body;

      if (supabase && !useCsvFallback) {
        const updateData: Record<string, unknown> = {
          user_id: req.user!.id,
          headline: headline || null,
          location: location || null,
          bio: bio || null,
          skills: skills || [],
          experience_years: experience_years ?? 0,
          education: education || [],
          work_preferences: work_preferences || {},
        };

        if (resume_id !== undefined) {
          updateData.resume_id = resume_id;
        }

        const { data, error } = await supabase
          .from("candidate_profiles")
          .upsert(updateData, { onConflict: 'user_id' })
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json({ ...data, user: req.user });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Profile endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  // ============================================================
  // JOB ENDPOINTS
  // ============================================================

  app.get("/api/v1/jobs", async (req, res) => {
    try {
      const { q, location, department, job_type, status, remote_only, salary_min, salary_max, sort_by, page, limit } = req.query;

      let query = supabase!.from("jobs").select("*", { count: "exact" });

      // Public only sees active jobs, recruiters/admins can filter by status
      if (!status || status === "active") {
        query = query.eq("status", "active");
      } else if (req.user && ["admin", "recruiter"].includes(req.user.role)) {
        query = query.eq("status", status as string);
      }

      // Search
      if (typeof q === "string" && q.trim()) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,department.ilike.%${q}%,location.ilike.%${q}%`);
      }

      // Filters
      if (typeof location === "string" && location.trim()) {
        query = query.ilike("location", `%${location}%`);
      }
      if (typeof department === "string" && department.trim()) {
        query = query.eq("department", department);
      }
      if (typeof job_type === "string" && job_type.trim()) {
        query = query.eq("type", job_type);
      }
      if (typeof salary_min === "string") {
        query = query.gte("salary_max", Number(salary_min));
      }
      if (typeof salary_max === "string") {
        query = query.lte("salary_min", Number(salary_max));
      }

      // Sort
      const sortBy = typeof sort_by === "string" ? sort_by : "posted_at";
      switch (sortBy) {
        case "salary":
          query = query.order("salary_max", { ascending: false });
          break;
        case "date":
          query = query.order("posted_at", { ascending: false });
          break;
        default:
          query = query.order("posted_at", { ascending: false });
      }

      // Pagination
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) {
        res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
        return;
      }

      res.json({
        jobs: data,
        total: count,
        page: pageNum,
        limit: limitNum,
      });
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.get("/api/v1/jobs/bookmarked", requireAuth, requireRole("candidate"), async (req: AuthRequest, res) => {
    try {
      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("job_bookmarks")
          .select("*, jobs(*)")
          .eq("candidate_id", req.user!.id)
          .order("created_at", { ascending: false });

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        const jobs = (data || []).map((b: any) => b.jobs).filter(Boolean);
        res.json({ jobs });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Bookmark endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.get("/api/v1/jobs/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) {
          res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
          return;
        }

        res.json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Job endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.post("/api/v1/jobs", requireAuth, requireRole("admin", "recruiter"), async (req: AuthRequest, res) => {
    try {
      const {
        title,
        company_name,
        department,
        location,
        type,
        description,
        required_skills,
        preferred_skills,
        experience_min_years,
        experience_max_years,
        salary_min,
        salary_max,
        salary_period,
        status = "draft",
      } = req.body;

      if (!title) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Job title is required" } });
        return;
      }

      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("jobs")
          .insert({
            title,
            company_name: company_name || null,
            department: department || null,
            location: location || null,
            type: type || null,
            description: description || null,
            required_skills: required_skills || [],
            preferred_skills: preferred_skills || [],
            experience_min_years: experience_min_years ?? null,
            experience_max_years: experience_max_years ?? null,
            salary_min: salary_min ?? null,
            salary_max: salary_max ?? null,
            salary_period: salary_period || "yearly",
            status,
            posted_by: req.user!.id,
          })
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.status(201).json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Job endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.patch("/api/v1/jobs/:id", requireAuth, requireRole("admin", "recruiter"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("jobs")
          .update(req.body)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Job endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.delete("/api/v1/jobs/:id", requireAuth, requireRole("admin", "recruiter"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      if (supabase && !useCsvFallback) {
        // Soft delete: set status to closed
        const { error } = await supabase
          .from("jobs")
          .update({ status: "closed" })
          .eq("id", id);

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json({ success: true });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Job endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  // ============================================================
  // APPLICATION ENDPOINTS
  // ============================================================

  app.post("/api/v1/applications", requireAuth, requireRole("candidate"), async (req: AuthRequest, res) => {
    try {
      const { job_id, cover_letter, portfolio_url, resume_url, resume_id, ai_score, screening_answers } = req.body;

      if (!job_id) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "job_id is required" } });
        return;
      }

      if (supabase && !useCsvFallback) {
        // Check job exists
        const { data: job } = await supabase
          .from("jobs")
          .select("id, title")
          .eq("id", job_id)
          .single();

        if (!job) {
          res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
          return;
        }

        // Check for duplicate
        const { data: existing } = await supabase
          .from("applications")
          .select("id")
          .eq("candidate_id", req.user!.id)
          .eq("job_id", job_id)
          .single();

        if (existing) {
          res.status(409).json({ error: { code: "CONFLICT", message: "Already applied to this job" } });
          return;
        }

        const timeline = [{ status: "Applied", changed_at: new Date().toISOString() }];

        const { data, error } = await supabase
          .from("applications")
          .insert({
            candidate_id: req.user!.id,
            job_id,
            cover_letter: cover_letter || null,
            portfolio_url: portfolio_url || null,
            resume_url: resume_url || null,
            resume_id: resume_id || null,
            ai_score: ai_score ?? null,
            screening_answers: screening_answers || [],
            status: "Applied",
            timeline,
          })
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.status(201).json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Application endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.get("/api/v1/applications/me", requireAuth, requireRole("candidate"), async (req: AuthRequest, res) => {
    try {
      const { status, page, limit } = req.query;

      if (supabase && !useCsvFallback) {
        let query = supabase
          .from("applications")
          .select("*, jobs(title, company_name, location)", { count: "exact" })
          .eq("candidate_id", req.user!.id);

        if (typeof status === "string") {
          query = query.eq("status", status);
        }

        query = query.order("applied_at", { ascending: false });

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        const { data, error, count } = await query.range(from, to);

        if (error) {
          console.error('Database error fetching candidate applications:', error);
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: "Failed to fetch applications" } });
          return;
        }

        // Flatten job data into application
        const flattenedData = (data || []).map((app: any) => ({
          ...app,
          job_title: app.jobs?.title,
          company_name: app.jobs?.company_name,
          location: app.jobs?.location,
        }));

        res.json({
          applications: flattenedData,
          total: count,
          page: pageNum,
          limit: limitNum,
        });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Application endpoint requires Supabase" } });
      }
    } catch (error) {
      console.error('Internal error fetching candidate applications:', error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An internal error occurred" } });
    }
  });

  app.get("/api/v1/applications", requireAuth, requireRole("admin", "recruiter"), async (req: AuthRequest, res) => {
    try {
      const { job_id, status, page, limit } = req.query;

      if (supabase && !useCsvFallback) {
        let query = supabase
          .from("applications")
          .select("*, jobs(title, company_name, location), users!candidate_id(first_name, last_name, email, phone)", { count: "exact" })
          .order("applied_at", { ascending: false });

        if (typeof job_id === "string") {
          query = query.eq("job_id", job_id);
        }
        if (typeof status === "string") {
          query = query.eq("status", status);
        }

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        const { data, error, count } = await query.range(from, to);

        if (error) {
          console.error('Database error fetching applications:', error);
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: "Failed to fetch applications" } });
          return;
        }

        res.json({
          applications: data,
          total: count,
          page: pageNum,
          limit: limitNum,
        });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Application endpoint requires Supabase" } });
      }
    } catch (error) {
      console.error('Internal error fetching applications:', error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An internal error occurred" } });
    }
  });

  app.patch("/api/v1/applications/:id", requireAuth, requireRole("admin", "recruiter"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status, ai_score } = req.body;

      if (supabase && !useCsvFallback) {
        // Get current application to build timeline
        const { data: current } = await supabase
          .from("applications")
          .select("timeline, status")
          .eq("id", id)
          .single();

        const timeline = Array.isArray(current?.timeline) ? [...current.timeline] : [];
        if (status && status !== current?.status) {
          timeline.push({ status, changed_at: new Date().toISOString() });
        }

        const updateData: any = {
          timeline,
        };

        if (status !== undefined) {
          updateData.status = status;
        }

        if (ai_score !== undefined) {
          updateData.ai_score = ai_score;
        }

        const { data, error } = await supabase
          .from("applications")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Application endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.get("/api/v1/applications/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("applications")
          .select("*, jobs(*)")
          .eq("id", id)
          .single();

        if (error || !data) {
          res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
          return;
        }

        // Candidates can only see their own applications
        if (req.user!.role === "candidate" && data.candidate_id !== req.user!.id) {
          res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
          return;
        }

        res.json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Application endpoint requires Supabase" } });
      }
    } catch (error) {
      console.error('Internal error fetching application:', error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An internal error occurred" } });
    }
  });

  // ============================================================
  // BOOKMARK ENDPOINTS
  // ============================================================

  app.post("/api/v1/jobs/:jobId/bookmark", requireAuth, requireRole("candidate"), async (req: AuthRequest, res) => {
    try {
      const { jobId } = req.params;

      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("job_bookmarks")
          .upsert({ candidate_id: req.user!.id, job_id: jobId })
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.status(201).json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Bookmark endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.delete("/api/v1/jobs/:jobId/bookmark", requireAuth, requireRole("candidate"), async (req: AuthRequest, res) => {
    try {
      const { jobId } = req.params;

      if (supabase && !useCsvFallback) {
        const { error } = await supabase
          .from("job_bookmarks")
          .delete()
          .eq("candidate_id", req.user!.id)
          .eq("job_id", jobId);

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json({ success: true });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Bookmark endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  // ============================================================
  // INTERVIEW ENDPOINTS
  // ============================================================

  app.post("/api/v1/interviews", requireAuth, requireRole("admin", "recruiter"), async (req: AuthRequest, res) => {
    try {
      const { application_id, scheduled_at, interview_type, meeting_link, interviewer_name, notes_for_candidate } = req.body;

      if (!application_id || !scheduled_at || !interview_type) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "application_id, scheduled_at, and interview_type are required" } });
        return;
      }

      if (supabase && !useCsvFallback) {
        // Get application details
        const { data: app } = await supabase
          .from("applications")
          .select("candidate_id, job_id")
          .eq("id", application_id)
          .single();

        if (!app) {
          res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
          return;
        }

        const { data, error } = await supabase
          .from("interviews")
          .insert({
            application_id,
            candidate_id: app.candidate_id,
            job_id: app.job_id,
            scheduled_at,
            interview_type,
            meeting_link: meeting_link || null,
            interviewer_name: interviewer_name || null,
            notes_for_candidate: notes_for_candidate || null,
            status: "scheduled",
          })
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        // Update application status
        await supabase
          .from("applications")
          .update({ status: "Interview Scheduled" })
          .eq("id", application_id);

        res.status(201).json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Interview endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.patch("/api/v1/interviews/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("interviews")
          .update(req.body)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        // If interview completed, update application status
        if (req.body.status === "completed" && data?.application_id) {
          await supabase
            .from("applications")
            .update({ status: "Interview Completed" })
            .eq("id", data.application_id);
        }

        res.json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Interview endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.get("/api/v1/interviews", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (supabase && !useCsvFallback) {
        let query = supabase.from("interviews").select("*, applications(job_id, status)");

        if (req.user!.role === "candidate") {
          query = query.eq("candidate_id", req.user!.id);
        }

        const { data, error } = await query.order("scheduled_at", { ascending: true });

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json({ interviews: data });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Interview endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  // ============================================================
  // RESUME ENDPOINTS - Proxy to candidatePages server
  // ============================================================

  app.get("/api/v1/resume/:resumeId", requireAuth, requireRole("admin", "recruiter", "candidate"), async (req: AuthRequest, res) => {
    try {
      const { resumeId } = req.params;
      const CANDIDATE_PAGES_URL = process.env.CANDIDATE_PAGES_URL || "http://localhost:3002/api/v1";
      const targetUrl = `${CANDIDATE_PAGES_URL}/resume/${resumeId}`;
      
      console.log(`[Portal] Fetching resume from: ${targetUrl}`);
      
      const response = await fetch(targetUrl, {
        headers: {
          'Authorization': req.headers.authorization || '',
        },
      });

      console.log(`[Portal] Resume response status: ${response.status}, content-type: ${response.headers.get('content-type')}`);

      const contentType = response.headers.get('content-type');
      
      // Check if response is JSON
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[Portal] Resume endpoint returned non-JSON response:', text.substring(0, 200));
        res.status(503).json({ 
          error: { 
            code: "SERVICE_UNAVAILABLE", 
            message: "Candidate Pages backend API returned an invalid response. Check server logs." 
          } 
        });
        return;
      }

      const data = await response.json();
      
      if (!response.ok) {
        console.error('[Portal] Resume fetch failed:', data);
        res.status(response.status).json(data);
        return;
      }

      console.log('[Portal] Resume fetched successfully');
      res.json(data);
    } catch (error) {
      console.error('[Portal] Resume proxy error:', error);
      res.status(500).json({ 
        error: { 
          code: "INTERNAL_ERROR", 
          message: `Failed to fetch resume: ${error instanceof Error ? error.message : 'Unknown error'}` 
        } 
      });
    }
  });

  // ============================================================
  // PROGRAM (KNOWLEDGE FACTORY) ENDPOINTS
  // ============================================================

  app.get("/api/v1/programs", async (req, res) => {
    try {
      if (supabase && !useCsvFallback) {
        let query = supabase.from("programs").select("*");

        if (typeof req.query.category === "string") {
          query = query.eq("category", req.query.category);
        }
        if (typeof req.query.enrollment_status === "string") {
          query = query.eq("enrollment_status", req.query.enrollment_status);
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json({ programs: data });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Program endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.post("/api/v1/programs", requireAuth, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const { name, description, category, duration, enrollment_status, prerequisites } = req.body;

      if (!name) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Program name is required" } });
        return;
      }

      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("programs")
          .insert({
            name,
            description: description || null,
            category: category || null,
            duration: duration || null,
            enrollment_status: enrollment_status || "open",
            prerequisites: prerequisites || [],
            created_by: req.user!.id,
          })
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.status(201).json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Program endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.post("/api/v1/programs/:programId/apply", requireAuth, requireRole("candidate"), async (req: AuthRequest, res) => {
    try {
      const { programId } = req.params;
      const { full_name, email, phone, university, linkedin_url, resume_url, statement_of_purpose } = req.body;

      if (!statement_of_purpose || !university) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "statement_of_purpose and university are required" } });
        return;
      }

      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("program_applications")
          .insert({
            candidate_id: req.user!.id,
            program_id: programId,
            full_name: full_name || `${req.user!.first_name} ${req.user!.last_name}`.trim(),
            email: email || req.user!.email,
            phone: phone || req.user!.phone,
            university,
            linkedin_url: linkedin_url || null,
            resume_url: resume_url || null,
            statement_of_purpose,
            status: "Submitted",
          })
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.status(201).json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Program application endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.get("/api/v1/programs/:programId/applications", requireAuth, requireRole("admin", "recruiter"), async (req: AuthRequest, res) => {
    try {
      const { programId } = req.params;

      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("program_applications")
          .select("*")
          .eq("program_id", programId)
          .order("submitted_at", { ascending: false });

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json({ applications: data });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Program applications endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.patch("/api/v1/programs/applications/:id", requireAuth, requireRole("admin", "recruiter"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("program_applications")
          .update({ status: status || "Under Review" })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Program application update endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.get("/api/v1/programs/applications/me", requireAuth, requireRole("candidate"), async (req: AuthRequest, res) => {
    try {
      if (supabase && !useCsvFallback) {
        const { data, error } = await supabase
          .from("program_applications")
          .select("*")
          .eq("candidate_id", req.user!.id)
          .order("submitted_at", { ascending: false });

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json({ applications: data });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Program applications endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  // ============================================================
  // USER MANAGEMENT (Admin Only)
  // ============================================================

  app.get("/api/v1/users", requireAuth, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      if (supabase && !useCsvFallback) {
        let query = supabase.from("users").select("id, email, first_name, last_name, phone, role, status, created_at");

        if (typeof req.query.role === "string") {
          query = query.eq("role", req.query.role);
        }
        if (typeof req.query.status === "string") {
          query = query.eq("status", req.query.status);
        }
        if (typeof req.query.q === "string") {
          query = query.or(`email.ilike.%${req.query.q}%,first_name.ilike.%${req.query.q}%,last_name.ilike.%${req.query.q}%`);
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json({ users: data });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "User management endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.post("/api/v1/users", requireAuth, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const { email, password, first_name, last_name, phone, role, status = "active" } = req.body;

      if (!email || !password || !first_name || !last_name || !role) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "email, password, first_name, last_name, and role are required" } });
        return;
      }

      const validRoles: UserRole[] = ["admin", "recruiter", "candidate"];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid role" } });
        return;
      }

      // Only superadmin can create admin users
      if (role === "admin" && req.user!.role !== "superadmin") {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "Only superadmin can create admin users" } });
        return;
      }

      if (supabase && !useCsvFallback) {
        const passwordHash = await hashPassword(password);

        const { data, error } = await supabase
          .from("users")
          .insert({
            email: email.toLowerCase().trim(),
            password_hash: passwordHash,
            first_name,
            last_name,
            phone: phone || null,
            role,
            status,
          })
          .select("id, email, first_name, last_name, phone, role, status, created_at")
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        // Create candidate profile if needed
        if (role === "candidate") {
          await supabase
            .from("candidate_profiles")
            .insert({
              user_id: data.id,
              skills: [],
              experience_years: 0,
              education: [],
              work_preferences: {},
            });
        }

        res.status(201).json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "User management endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.patch("/api/v1/users/:id", requireAuth, requireRole("admin", "superadmin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { first_name, last_name, phone, role, status, password } = req.body;

      if (supabase && !useCsvFallback) {
        // Check if target user is superadmin
        const { data: targetUser } = await supabase
          .from("users")
          .select("is_superadmin, role")
          .eq("id", id)
          .single();

        if (targetUser?.is_superadmin) {
          res.status(403).json({ error: { code: "FORBIDDEN", message: "Cannot modify superadmin user" } });
          return;
        }

        // Only superadmin can modify admin users or assign admin role
        if (req.user!.role !== "superadmin") {
          if (targetUser?.role === "admin") {
            res.status(403).json({ error: { code: "FORBIDDEN", message: "Only superadmin can modify admin users" } });
            return;
          }
          if (role === "admin" || role === "superadmin") {
            res.status(403).json({ error: { code: "FORBIDDEN", message: "Only superadmin can assign admin or superadmin role" } });
            return;
          }
        }

        // Prevent non-superadmin from setting superadmin role
        if (role === "superadmin" && req.user!.role !== "superadmin") {
          res.status(403).json({ error: { code: "FORBIDDEN", message: "Only superadmin can assign superadmin role" } });
          return;
        }

        const updateData: any = {};
        if (first_name !== undefined) updateData.first_name = first_name;
        if (last_name !== undefined) updateData.last_name = last_name;
        if (phone !== undefined) updateData.phone = phone;
        if (role !== undefined) updateData.role = role;
        if (status !== undefined) updateData.status = status;
        if (password) {
          updateData.password_hash = await hashPassword(password);
        }

        const { data, error } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", id)
          .select("id, email, first_name, last_name, phone, role, status, created_at")
          .single();

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json(data);
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "User management endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  app.delete("/api/v1/users/:id", requireAuth, requireRole("admin", "superadmin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      if (supabase && !useCsvFallback) {
        // Check if target user is superadmin
        const { data: targetUser } = await supabase
          .from("users")
          .select("is_superadmin, role")
          .eq("id", id)
          .single();

        if (targetUser?.is_superadmin) {
          res.status(403).json({ error: { code: "FORBIDDEN", message: "Cannot delete or disable superadmin user" } });
          return;
        }

        // Only superadmin can delete admins
        if (targetUser?.role === "admin" && req.user!.role !== "superadmin") {
          res.status(403).json({ error: { code: "FORBIDDEN", message: "Only superadmin can delete admin users" } });
          return;
        }

        // Soft delete: set status to disabled
        const { error } = await supabase
          .from("users")
          .update({ status: "disabled" })
          .eq("id", id);

        if (error) {
          res.status(500).json({ error: { code: "DATABASE_ERROR", message: error.message } });
          return;
        }

        res.json({ success: true });
      } else {
        res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "User management endpoint requires Supabase" } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  // ============================================================
  // AUTOMATIONS API (Admin Only)
  // ============================================================

  app.get("/api/v1/automations", requireAuth, requireRole("admin"), (req: AuthRequest, res) => {
    // Return static templates since automations aren't in the DB schema yet
    res.json({
      automations: [
        { id: 1, type: "Welcome", template: "Welcome to our platform! We're excited to have you.", enabled: false },
        { id: 2, type: "Rejection", template: "Thank you for your interest. Unfortunately, we've decided to move forward with other candidates.", enabled: false },
        { id: 3, type: "Shortlist", template: "Great news! You've been shortlisted for the next round.", enabled: false },
      ],
    });
  });

  app.put("/api/v1/automations", requireAuth, requireRole("admin"), (req: AuthRequest, res) => {
    const { type, template, enabled } = req.body;
    
    if (!type || !template) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "type and template are required" } });
      return;
    }

    // For now, just echo back the update since we don't have DB storage
    res.json({ type, template, enabled: enabled ?? false });
  });

  // ============================================================
  // BULK UPLOAD API
  // ============================================================

  app.post("/api/v1/bulk-upload", requireAuth, requireRole("admin", "recruiter"), async (req: AuthRequest, res) => {
    try {
      const { resumes } = req.body;

      if (!Array.isArray(resumes) || resumes.length === 0) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "resumes array is required" } });
        return;
      }

      // TODO: Implement actual resume parsing and storage
      // For now, return success with count
      const count = resumes.length;

      res.json({
        message: `Successfully queued ${count} resume(s) for processing`,
        count,
        status: "processing",
      });
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: (error as Error).message } });
    }
  });

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  app.get("/api/v1/health", (req, res) => {
    res.json({
      status: "ok",
      port: PORT,
      database: supabase && !useCsvFallback ? "supabase" : "csv-fallback",
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================
  // VITE MIDDLEWARE
  // ============================================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Unified Portal API running on:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://10.179.189.173:${PORT}`);
    console.log(`📊 Database mode: ${supabase && !useCsvFallback ? "✅ Supabase" : "⚠️  CSV Fallback"}`);
    console.log(`\n📋 Available endpoints:`);
    console.log(`   POST   /api/v1/auth/register`);
    console.log(`   POST   /api/v1/auth/login`);
    console.log(`   POST   /api/v1/auth/refresh`);
    console.log(`   POST   /api/v1/auth/logout`);
    console.log(`   GET    /api/v1/auth/me`);
    console.log(`   GET    /api/v1/profiles/me`);
    console.log(`   PUT    /api/v1/profiles/me`);
    console.log(`   GET    /api/v1/jobs`);
    console.log(`   POST   /api/v1/jobs`);
    console.log(`   PATCH  /api/v1/jobs/:id`);
    console.log(`   DELETE /api/v1/jobs/:id`);
    console.log(`   GET    /api/v1/applications`);
    console.log(`   POST   /api/v1/applications`);
    console.log(`   PATCH  /api/v1/applications/:id`);
    console.log(`   GET    /api/v1/interviews`);
    console.log(`   POST   /api/v1/interviews`);
    console.log(`   PATCH  /api/v1/interviews/:id`);
    console.log(`   GET    /api/v1/programs`);
    console.log(`   POST   /api/v1/programs`);
    console.log(`   GET    /api/v1/users (admin)`);
    console.log(`   POST   /api/v1/users (admin)`);
    console.log(`   PATCH  /api/v1/users/:id (admin)`);
    console.log(`   DELETE /api/v1/users/:id (admin)`);
    console.log(`   GET    /api/v1/health\n`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
