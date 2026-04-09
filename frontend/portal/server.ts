import express from "express";
import crypto from "crypto";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseCsvFile,
  stringifyCsv,
  type CsvKind,
} from "./src/lib/csv-parser";
import type {
  Application,
  ApplicationStatus,
  Automation,
  AutomationType,
  Job,
  JobStatus,
  User,
  UserRole,
  UserStatus,
} from "./src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3001;

  const AUTH_SECRET = process.env.PORTAL_AUTH_SECRET ?? "portal_dev_secret";
  const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

  app.use(express.json());

  const DATA_DIR = path.join(process.cwd(), "data");
  const JOBS_FILE = path.join(DATA_DIR, "jobs.csv");
  const APPLICATIONS_FILE = path.join(DATA_DIR, "applications.csv");
  const USERS_FILE = path.join(DATA_DIR, "users.csv");
  const AUTOMATIONS_FILE = path.join(DATA_DIR, "automations.csv");

  const JOB_HEADERS = [
    "id",
    "title",
    "department",
    "location",
    "status",
    "applicants",
    "newToday",
    "postedDate",
    "timeToHireDays",
  ];

  const APPLICATION_HEADERS = [
    "id",
    "name",
    "email",
    "phone",
    "role",
    "match",
    "status",
    "date",
    "avatarSeed",
  ];

  const USER_HEADERS = [
    "id",
    "name",
    "email",
    "role",
    "status",
    "initials",
    "color",
    "passwordHash",
  ];

  const AUTOMATION_HEADERS = ["id", "type", "template", "enabled"];

  type StoredUser = User & { passwordHash?: string };

  type AuthPayload = {
    userId: number;
    exp: number;
  };

  type AuthedRequest = express.Request & { auth?: { user: User; userId: number } };

  function getNextId(items: Array<{ id: number }>): number {
    const maxId = items.reduce((max, item) => (item.id > max ? item.id : max), 0);
    return maxId + 1;
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  function coerceNumber(value: unknown, fallback: number): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function formatDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function computeInitials(name: string): string {
    const parts = name
      .trim()
      .split(/\s+/g)
      .filter(Boolean);

    const first = parts[0]?.[0] ?? "";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : parts[0]?.[1] ?? "";
    return (first + second).toUpperCase();
  }

  function parseJobStatus(value: unknown): JobStatus {
    return value === "Active" || value === "Draft" || value === "Closed" ? value : "Draft";
  }

  function parseApplicationStatus(value: unknown): ApplicationStatus {
    return value === "Pending" || value === "Shortlisted" || value === "Rejected" ? value : "Pending";
  }

  function parseUserRole(value: unknown): UserRole {
    return value === "admin" || value === "recruiter" ? value : "recruiter";
  }

  function parseUserStatus(value: unknown): UserStatus {
    return value === "Active" || value === "Disabled" || value === "Inactive" ? value : "Active";
  }

  function parseAutomationType(value: unknown): AutomationType {
    return value === "Welcome" || value === "Rejection" || value === "Shortlist" ? value : "Welcome";
  }

  function nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  function sign(value: string): string {
    return crypto.createHmac("sha256", AUTH_SECRET).update(value).digest("base64url");
  }

  function createToken(payload: AuthPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = sign(encoded);
    return `${encoded}.${signature}`;
  }

  function verifyToken(token: string): AuthPayload | null {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return null;
    }

    const [encoded, signature] = parts;
    const expected = sign(encoded);

    try {
      const signatureOk = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      if (!signatureOk) {
        return null;
      }
    } catch {
      return null;
    }

    try {
      const decoded = Buffer.from(encoded, "base64url").toString("utf-8");
      const payload = JSON.parse(decoded) as AuthPayload;

      if (!payload || typeof payload.userId !== "number" || typeof payload.exp !== "number") {
        return null;
      }

      if (payload.exp < nowSeconds()) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("base64url");
    const derived = crypto.scryptSync(password, salt, 64);
    return `scrypt.${salt}.${derived.toString("base64url")}`;
  }

  function verifyPassword(password: string, stored: string): boolean {
    const parts = stored.split(".");
    if (parts.length !== 3) {
      return false;
    }

    const [scheme, salt, hash] = parts;
    if (scheme !== "scrypt" || !salt || !hash) {
      return false;
    }

    try {
      const expected = Buffer.from(hash, "base64url");
      const derived = crypto.scryptSync(password, salt, expected.length);
      return crypto.timingSafeEqual(expected, derived);
    } catch {
      return false;
    }
  }

  function sanitizeUser(user: StoredUser): User {
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
  }

  function getBearerToken(req: express.Request): string | null {
    const header = req.headers.authorization;
    if (!header || typeof header !== "string") {
      return null;
    }

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return null;
    }

    return token;
  }

  function readCsv<T>(filePath: string, kind: CsvKind): T[] {
    // TODO: Replace CSV I/O with Supabase queries
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }

    return parseCsvFile(filePath, kind) as T[];
  }

  function writeCsv(filePath: string, headers: string[], rows: Array<object>) {
    // TODO: Replace CSV I/O with Supabase queries
    fs.writeFileSync(filePath, stringifyCsv(headers, rows), "utf-8");
  }

  function requireAuth(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
    try {
      const token = getBearerToken(req);
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const payload = verifyToken(token);
      if (!payload) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const users = readCsv<StoredUser>(USERS_FILE, "users");
      const stored = users.find((item) => item.id === payload.userId);
      if (!stored) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (stored.status !== "Active") {
        res.status(403).json({ error: "User is not active" });
        return;
      }

      req.auth = { user: sanitizeUser(stored), userId: stored.id };
      next();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  function requireRole(allowed: UserRole[]) {
    return (req: AuthedRequest, res: express.Response, next: express.NextFunction) => {
      const user = req.auth?.user;
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!allowed.includes(user.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      next();
    };
  }

  // --- AUTH ENDPOINTS ---

  app.post("/api/auth/login", (req, res) => {
    try {
      const body = isRecord(req.body) ? req.body : {};

      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const users = readCsv<StoredUser>(USERS_FILE, "users");
      const index = users.findIndex((item) => item.email.trim().toLowerCase() === email);
      if (index === -1) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const user = users[index];

      if (user.status !== "Active") {
        res.status(403).json({ error: "User is not active" });
        return;
      }

      const existingHash = typeof user.passwordHash === "string" ? user.passwordHash : "";

      // Bootstrap behavior: if passwordHash is empty, treat the provided password as the initial password.
      if (!existingHash) {
        const next = [...users];
        const updated: StoredUser = { ...user, passwordHash: hashPassword(password) };
        next[index] = updated;
        writeCsv(USERS_FILE, USER_HEADERS, next);

        const token = createToken({ userId: updated.id, exp: nowSeconds() + TOKEN_TTL_SECONDS });
        res.json({ token, user: sanitizeUser(updated) });
        return;
      }

      if (!verifyPassword(password, existingHash)) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const token = createToken({ userId: user.id, exp: nowSeconds() + TOKEN_TTL_SECONDS });
      res.json({ token, user: sanitizeUser(user) });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/auth/me", requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: req.auth!.user });
  });

  // All other /api routes require authentication.
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth/")) {
      next();
      return;
    }
    requireAuth(req as AuthedRequest, res, next);
  });

  // --- JOB ENDPOINTS ---

  app.get("/api/jobs", (req, res) => {
    try {
      const jobs = readCsv<Job>(JOBS_FILE, "jobs");
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/jobs", (req, res) => {
    try {
      const jobs = readCsv<Job>(JOBS_FILE, "jobs");
      const body = isRecord(req.body) ? req.body : {};

      const job: Job = {
        id: getNextId(jobs),
        title: typeof body.title === "string" ? body.title : "Untitled Role",
        department: typeof body.department === "string" ? body.department : "General",
        location: typeof body.location === "string" ? body.location : "Remote",
        status: parseJobStatus(body.status),
        applicants: coerceNumber(body.applicants, 0),
        newToday: coerceNumber(body.newToday, 0),
        postedDate: typeof body.postedDate === "string" ? body.postedDate : formatDateIso(new Date()),
        timeToHireDays:
          body.timeToHireDays === null || body.timeToHireDays === undefined || body.timeToHireDays === ""
            ? null
            : coerceNumber(body.timeToHireDays, 0),
      };

      const updated = [...jobs, job];
      writeCsv(JOBS_FILE, JOB_HEADERS, updated);
      res.status(201).json(job);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/jobs/:id", (req, res) => {
    try {
      const jobId = Number(req.params.id);
      const jobs = readCsv<Job>(JOBS_FILE, "jobs");
      const job = jobs.find((item) => item.id === jobId);

      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      res.json(job);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.patch("/api/jobs/:id", (req, res) => {
    try {
      const jobId = Number(req.params.id);
      const jobs = readCsv<Job>(JOBS_FILE, "jobs");
      const index = jobs.findIndex((item) => item.id === jobId);

      if (index === -1) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const body = isRecord(req.body) ? req.body : {};
      const existing = jobs[index];

      const updatedJob: Job = {
        ...existing,
        title: typeof body.title === "string" ? body.title : existing.title,
        department: typeof body.department === "string" ? body.department : existing.department,
        location: typeof body.location === "string" ? body.location : existing.location,
        status: body.status !== undefined ? parseJobStatus(body.status) : existing.status,
        applicants:
          body.applicants !== undefined ? coerceNumber(body.applicants, existing.applicants) : existing.applicants,
        newToday: body.newToday !== undefined ? coerceNumber(body.newToday, existing.newToday) : existing.newToday,
        postedDate: typeof body.postedDate === "string" ? body.postedDate : existing.postedDate,
        timeToHireDays:
          body.timeToHireDays === undefined
            ? existing.timeToHireDays
            : body.timeToHireDays === null || body.timeToHireDays === ""
              ? null
              : coerceNumber(body.timeToHireDays, existing.timeToHireDays ?? 0),
      };

      const next = [...jobs];
      next[index] = updatedJob;
      writeCsv(JOBS_FILE, JOB_HEADERS, next);
      res.json(updatedJob);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/jobs/:id", (req, res) => {
    try {
      const jobId = Number(req.params.id);
      const jobs = readCsv<Job>(JOBS_FILE, "jobs");
      const next = jobs.filter((item) => item.id !== jobId);

      if (next.length === jobs.length) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      writeCsv(JOBS_FILE, JOB_HEADERS, next);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // --- APPLICATION ENDPOINTS ---

  app.get("/api/applications", (req, res) => {
    try {
      const applications = readCsv<Application>(APPLICATIONS_FILE, "applications");
      res.json(applications);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/applications", (req, res) => {
    try {
      const applications = readCsv<Application>(APPLICATIONS_FILE, "applications");
      const body = isRecord(req.body) ? req.body : {};

      const name = typeof body.name === "string" ? body.name : "Unknown Candidate";

      const application: Application = {
        id: getNextId(applications),
        name,
        email: typeof body.email === "string" ? body.email : "",
        phone: typeof body.phone === "string" ? body.phone : "",
        role: typeof body.role === "string" ? body.role : "",
        match: coerceNumber(body.match, 0),
        status: parseApplicationStatus(body.status),
        date: typeof body.date === "string" ? body.date : formatDateIso(new Date()),
        avatarSeed:
          typeof body.avatarSeed === "string" && body.avatarSeed
            ? body.avatarSeed
            : name.toLowerCase().replace(/\s+/g, "-"),
      };

      const updated = [...applications, application];
      writeCsv(APPLICATIONS_FILE, APPLICATION_HEADERS, updated);
      res.status(201).json(application);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/applications/:id", (req, res) => {
    try {
      const applicationId = Number(req.params.id);
      const applications = readCsv<Application>(APPLICATIONS_FILE, "applications");
      const application = applications.find((item) => item.id === applicationId);

      if (!application) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      res.json(application);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.patch("/api/applications/:id", (req, res) => {
    try {
      const applicationId = Number(req.params.id);
      const applications = readCsv<Application>(APPLICATIONS_FILE, "applications");
      const index = applications.findIndex((item) => item.id === applicationId);

      if (index === -1) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      const body = isRecord(req.body) ? req.body : {};
      const existing = applications[index];
      const updatedApplication: Application = {
        ...existing,
        status: body.status !== undefined ? parseApplicationStatus(body.status) : existing.status,
      };

      const next = [...applications];
      next[index] = updatedApplication;
      writeCsv(APPLICATIONS_FILE, APPLICATION_HEADERS, next);
      res.json(updatedApplication);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // --- USERS ENDPOINTS ---

  app.get("/api/users", requireRole(["admin"]), (req, res) => {
    try {
      const users = readCsv<StoredUser>(USERS_FILE, "users");
      res.json(users.map(sanitizeUser));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/users", requireRole(["admin"]), (req, res) => {
    try {
      const users = readCsv<StoredUser>(USERS_FILE, "users");
      const body = isRecord(req.body) ? req.body : {};

      const password = typeof body.password === "string" ? body.password : "";
      if (!password) {
        res.status(400).json({ error: "Password is required" });
        return;
      }

      const name = typeof body.name === "string" ? body.name : "New User";
      const initials = typeof body.initials === "string" && body.initials ? body.initials : computeInitials(name);

      const user: StoredUser = {
        id: getNextId(users),
        name,
        email: typeof body.email === "string" ? body.email : "",
        role: parseUserRole(body.role),
        status: parseUserStatus(body.status),
        initials,
        color: typeof body.color === "string" && body.color ? body.color : undefined,
        passwordHash: hashPassword(password),
      };

      const updated = [...users, user];
      writeCsv(USERS_FILE, USER_HEADERS, updated);
      res.status(201).json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.patch("/api/users/:id", requireRole(["admin"]), (req, res) => {
    try {
      const userId = Number(req.params.id);
      const users = readCsv<StoredUser>(USERS_FILE, "users");
      const index = users.findIndex((item) => item.id === userId);

      if (index === -1) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const body = isRecord(req.body) ? req.body : {};
      const existing = users[index];

      const password = typeof body.password === "string" ? body.password : "";

      const nextUser: StoredUser = {
        ...existing,
        name: typeof body.name === "string" ? body.name : existing.name,
        email: typeof body.email === "string" ? body.email : existing.email,
        role: body.role !== undefined ? parseUserRole(body.role) : existing.role,
        status: body.status !== undefined ? parseUserStatus(body.status) : existing.status,
        initials: typeof body.initials === "string" ? body.initials : existing.initials,
        color:
          body.color === undefined
            ? existing.color
            : typeof body.color === "string" && body.color
              ? body.color
              : undefined,
        passwordHash: password ? hashPassword(password) : existing.passwordHash,
      };

      const next = [...users];
      next[index] = nextUser;
      writeCsv(USERS_FILE, USER_HEADERS, next);
      res.json(sanitizeUser(nextUser));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/users/:id", requireRole(["admin"]), (req, res) => {
    try {
      const userId = Number(req.params.id);
      const users = readCsv<StoredUser>(USERS_FILE, "users");
      const next = users.filter((item) => item.id !== userId);

      if (next.length === users.length) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      writeCsv(USERS_FILE, USER_HEADERS, next);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // --- AUTOMATIONS ENDPOINTS ---

  app.get("/api/automations", requireRole(["admin"]), (req, res) => {
    try {
      const automations = readCsv<Automation>(AUTOMATIONS_FILE, "automations");
      res.json(automations);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/automations/email", requireRole(["admin"]), (req, res) => {
    try {
      const automations = readCsv<Automation>(AUTOMATIONS_FILE, "automations");
      const body = isRecord(req.body) ? req.body : {};

      const type = parseAutomationType(body.type);
      const template = typeof body.template === "string" ? body.template : "";
      const enabled = body.enabled === undefined ? undefined : Boolean(body.enabled);

      const index = automations.findIndex((item) => item.type === type);
      if (index === -1) {
        res.status(404).json({ error: "Automation not found" });
        return;
      }

      const updated: Automation = {
        ...automations[index],
        template,
        enabled: enabled === undefined ? automations[index].enabled : enabled,
      };

      const next = [...automations];
      next[index] = updated;
      writeCsv(AUTOMATIONS_FILE, AUTOMATION_HEADERS, next);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // --- BULK UPLOAD ---

  app.post("/api/bulk-upload", (req, res) => {
    res.json({ message: "Bulk upload placeholder", count: coerceNumber(req.body?.count, 0) });
  });

  // --- VITE MIDDLEWARE ---

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
