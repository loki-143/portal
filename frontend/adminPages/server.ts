import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ENDPOINTS (Placeholder Logic) ---

  // User Management
  app.get("/api/users", (req, res) => {
    // TODO: Fetch users from database
    res.json({ message: "GET users endpoint", data: [] });
  });

  app.post("/api/users", (req, res) => {
    const userData = req.body;
    // TODO: Create user in database
    res.status(201).json({ message: "User created", data: userData });
  });

  app.patch("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    // TODO: Update user in database
    res.json({ message: `User ${id} updated`, data: updates });
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    // TODO: Delete user from database
    res.json({ message: `User ${id} deleted` });
  });

  // Job Management
  app.get("/api/jobs", (req, res) => {
    // TODO: Fetch jobs from database
    res.json({ message: "GET jobs endpoint", data: [] });
  });

  app.post("/api/jobs", (req, res) => {
    const jobData = req.body;
    // TODO: Create job in database
    res.status(201).json({ message: "Job created", data: jobData });
  });

  app.patch("/api/jobs/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    // TODO: Update job in database
    res.json({ message: `Job ${id} updated`, data: updates });
  });

  app.delete("/api/jobs/:id", (req, res) => {
    const { id } = req.params;
    // TODO: Delete job from database
    res.json({ message: `Job ${id} deleted` });
  });

  // Email Automations
  app.post("/api/automations/email", (req, res) => {
    const { type, template } = req.body;
    // TODO: Update email template
    res.json({ message: `${type} template updated`, template });
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
