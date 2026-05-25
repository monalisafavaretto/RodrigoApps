import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Firestore } from "@google-cloud/firestore";
import zlib from "zlib";

// Configuration
const DATABASE_FILE = process.env.VERCEL 
  ? "/tmp/database.json" 
  : path.join(process.cwd(), "database.json");

const PORT = 3000;

if (process.env.VERCEL && !fs.existsSync("/tmp/database.json")) {
  const seedPath = path.join(process.cwd(), "database.json");
  if (fs.existsSync(seedPath)) {
    try {
      fs.copyFileSync(seedPath, "/tmp/database.json");
      console.log("Successfully copied database.json seed to /tmp/database.json");
    } catch (e) {
      console.error("Failed to copy database.json seed:", e);
    }
  }
}

// Database helper functions
interface User {
  email: string;
  active: number;
  status: string;
  source: string;
  plan_key: string;
  plan_name: string;
  plan_limit: number;
  is_recurring: number;
  access_start: string;
  access_end: string;
  no_access_end: number;
  purchase_count: number;
  generated_count: number;
  total_generated_count: number;
  last_generated_at: string;
  billing_cycle_start: string;
  billing_cycle_end: string;
  next_reset_at: string;
  updated_at: string;
}

interface ProjectData {
  id: string;
  name: string;
  email: string;
  items: any[];
  createdAt: string;
  updatedAt: string;
}

interface WebhookLog {
  id: string;
  date: string;
  source: string;
  email: string;
  status: string;
  plan_detected: string;
  payload: any;
}

interface BlockedLog {
  date: string;
  email: string;
  reason: string;
  ip: string;
  userAgent: string;
}

interface DatabaseSchema {
  users: Record<string, User>;
  projects: ProjectData[];
  webhookLogs: WebhookLog[];
  blockedLogs: BlockedLog[];
}

// Generate standard date string for YYYY-MM-DD
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getOneYearLaterString(baseDateStr?: string) {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  base.setFullYear(base.getFullYear() + 1);
  return base.toISOString().split('T')[0];
}

// Initialize GCP Firestore client with custom project/database configuration from firebase-applet-config.json
let firestore: Firestore | null = null;
try {
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_FIRESTORE === "true") {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      firestore = new Firestore({
        projectId: config.projectId,
        databaseId: config.firestoreDatabaseId
      });
      console.log(`GCP Firestore initialized successfully with Project ID: ${config.projectId} and Database ID: ${config.firestoreDatabaseId}`);
    } else {
      firestore = new Firestore();
      console.log("GCP Firestore initialized successfully via Application Default Credentials.");
    }
  }
} catch (e) {
  console.warn("Could not initiate Firestore client (falling back to local filesystem):", e);
}

let hasHydratedFromFirestore = false;

// Function to pull latest database snapshot from Firestore and write it locally
async function hydrateFromFirestore() {
  if (!firestore) {
    console.log("Local development environment: skipping Firestore cloud database hydration.");
    return;
  }
  try {
    console.log("Hydrating local database.json from persistent GCP Firestore...");
    const docRef = firestore.collection("resina_db").doc("v1");
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data && data.db_compressed) {
        console.log("Found compressed database snapshot in Firestore. Decompressing...");
        const buffer = Buffer.from(data.db_compressed, "base64");
        const decompressedString = zlib.gunzipSync(buffer).toString("utf-8");
        const parsed = JSON.parse(decompressedString);
        
        // Overwrite local database.json with the persistent cloud backup
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(parsed, null, 2));
        console.log(`Successfully restored persistent database! Size: ${decompressedString.length} chars.`);
        hasHydratedFromFirestore = true;
      } else {
        console.log("GCP Firestore document is empty/malformed. Uploading current database to Firestore.");
        hasHydratedFromFirestore = true;
        const db = loadDatabase();
        await uploadToFirestore(db);
      }
    } else {
      console.log("GCP Firestore database contains no backup. Uploading base database to seed it.");
      hasHydratedFromFirestore = true;
      const db = loadDatabase();
      await uploadToFirestore(db);
    }
  } catch (err) {
    console.error("Failed to hydrate database from cloud backup, proceeding with local fallback:", err);
  }
}

// Sync current state to Firestore
async function uploadToFirestore(db: DatabaseSchema) {
  if (!firestore) return;
  if (!hasHydratedFromFirestore) {
    console.warn("Safety blocker: Refusing to upload local database because Firestore hydration was not completed/successful on startup.");
    return;
  }
  try {
    const stringified = JSON.stringify(db);
    const compressed = zlib.gzipSync(stringified).toString("base64");
    
    const docRef = firestore.collection("resina_db").doc("v1");
    await docRef.set({
      db_compressed: compressed,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log(`Backend database backup pushed to Firestore. Size: ${compressed.length} compressed bytes.`);
  } catch (err) {
    console.error("GCP Firestore backup upload failed:", err);
  }
}

// Ensure database file is initialized properly
function loadDatabase(): DatabaseSchema {
  const defaultSchema: DatabaseSchema = {
    users: {
      "admin123@resina.com": {
        email: "admin123@resina.com",
        active: 1,
        status: "approved",
        source: "manual",
        plan_key: "unlimited",
        plan_name: "Unlimited / Admin",
        plan_limit: 0,
        is_recurring: 1,
        access_start: getTodayString(),
        access_end: "",
        no_access_end: 1,
        purchase_count: 1,
        generated_count: 0,
        total_generated_count: 0,
        last_generated_at: "",
        billing_cycle_start: getTodayString(),
        billing_cycle_end: "",
        next_reset_at: "",
        updated_at: new Date().toISOString()
      }
    },
    projects: [],
    webhookLogs: [],
    blockedLogs: []
  };

  try {
    if (fs.existsSync(DATABASE_FILE)) {
      const raw = fs.readFileSync(DATABASE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      
      const users = parsed.users || {};
      const projects = parsed.projects || [];
      const webhookLogs = parsed.webhookLogs || [];
      const blockedLogs = parsed.blockedLogs || [];

      // Ensure default users are present
      for (const email of Object.keys(defaultSchema.users)) {
        const normEmail = email.toLowerCase().trim();
        if (!users[normEmail]) {
          users[normEmail] = defaultSchema.users[email];
        }
      }

      parsed.users = users;
      parsed.projects = projects;
      parsed.webhookLogs = webhookLogs;
      parsed.blockedLogs = blockedLogs;

      fs.writeFileSync(DATABASE_FILE, JSON.stringify(parsed, null, 2));
      return parsed as DatabaseSchema;
    }
  } catch (err) {
    console.error("Database reading error, bootstrap required:", err);
  }

  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(defaultSchema, null, 2));
  } catch (err) {
    console.error("Error writing database bootstrap file:", err);
  }
  return defaultSchema;
}

// Directly backup database to Firestore cloud storage
async function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(db, null, 2));
    if (firestore) {
      await uploadToFirestore(db);
    }
  } catch (err) {
    console.error("Failed to save database file:", err);
  }
}

// Lowify webhook extractor helpers
function extractEmailFromWebhook(data: any): string {
  let email = "";
  if (!data) return "";
  
  if (data.customer && data.customer.email) email = data.customer.email;
  else if (data.buyer && data.buyer.email) email = data.buyer.email;
  else if (data.client && data.client.email) email = data.client.email;
  else if (data.user && data.user.email) email = data.user.email;
  else if (data.payer && data.payer.email) email = data.payer.email;
  else if (data.email) email = data.email;
  else if (data.customer_email) email = data.customer_email;
  else if (data.data && data.data.comprador && data.data.comprador.email) email = data.data.comprador.email;
  else if (data.comprador && data.comprador.email) email = data.comprador.email;
  else if (data.data && data.data.customer && data.data.customer.email) email = data.data.customer.email;
  else if (data.order && data.order.customer && data.order.customer.email) email = data.order.customer.email;
  
  return email.trim().toLowerCase();
}

function extractStatusFromWebhook(data: any): string {
  let status = "";
  if (!data) return "";
  
  const eventStatus = data.event || data.event_name || data.eventName || (data.data && data.data.event);
  if (eventStatus) {
    const ev = String(eventStatus).toLowerCase().trim();
    if (["order.paid", "pedido_pago", "pedido.pago", "subscription.paid", "subscription.renewed"].includes(ev)) {
      return ev;
    }
  }

  if (data.status) status = data.status;
  else if (data.payment_status) status = data.payment_status;
  else if (data.order_status) status = data.order_status;
  else if (data.status_pagamento) status = data.status_pagamento;
  else if (data.data && data.data.status) status = data.data.status;
  
  return String(status).toLowerCase().trim();
}

// Plan detection helper
function detectPlanFromWebhook(data: any) {
  // All purchases/registrations are unified to the Unlimited plan - no image limits
  return { key: "unlimited", name: "Plano Único - Sem Limites", limit: 0 };
}

// Forward action to the user provided webhook URL
async function forwardWebhookToClient(payload: any) {
  const clientWebhookUrl = "https://resina-design-416344061304.us-east1.run.app/";
  try {
    console.log(`Forwarding event context to client's webhook: ${clientWebhookUrl}`);
    const res = await fetch(clientWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log(`Forward response code: ${res.status}`);
  } catch (err) {
    console.error("Error occurred forwarding webhook event to client webhook:", err);
  }
}

const app = express();
let hydrationPromise: Promise<void> | null = null;

// Middleware to ensure database is hydrated before resolving any request (especially in serverless Vercel)
app.use(async (req, res, next) => {
  if (!hasHydratedFromFirestore && firestore) {
    if (!hydrationPromise) {
      hydrationPromise = hydrateFromFirestore();
    }
    try {
      await hydrationPromise;
    } catch (err) {
      console.error("Database hydration failed inside middleware:", err);
    }
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

async function startServer() {
  // Log accesses / requests count
  app.use((req, res, next) => {
    // Basic server request logger
    next();
  });

  // API: Authentication / Login Validation
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email) {
      return res.status(200).json({ success: false, message: "O e-mail é obrigatório." });
    }

    const normEmail = email.trim().toLowerCase();
    
    // Admin checks
    if (normEmail === "admin123@resina.com") {
      if (password !== "admin123") {
        return res.status(200).json({ success: false, message: "Senha administrativa inválida." });
      }
    }

    const db = loadDatabase();
    const user = db.users[normEmail];

    // Check if user exists & is active
    if (!user) {
      // Record blocked attempt
      db.blockedLogs.push({
        date: new Date().toISOString(),
        email: normEmail,
        reason: "Email não cadastrado",
        ip: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown"
      });
      await saveDatabase(db);

      return res.status(200).json({ 
        success: false, 
        errorType: "non_existent",
        message: "E-mail de acesso não encontrado. Somente e-mails que possuem a compra/acesso liberado podem entrar."
      });
    }

    // Check active status
    if (user.active === 0) {
      return res.status(200).json({
        success: false,
        errorType: "inactive",
        message: "Seu acesso está inativo no momento. Entre em contato com o suporte."
      });
    }

    // Check expiration if access_end is present and no_access_end is inactive
    if (user.access_end && !user.no_access_end) {
      const today = getTodayString();
      if (today > user.access_end) {
        // Automatically deactivate user status
        user.active = 0;
        user.status = "expired_manual";
        user.updated_at = new Date().toISOString();
        await saveDatabase(db);

        // Record blocked log
        db.blockedLogs.push({
          date: new Date().toISOString(),
          email: normEmail,
          reason: "Acesso expirado",
          ip: req.ip || "unknown",
          userAgent: req.headers["user-agent"] || "unknown"
        });
        await saveDatabase(db);

        return res.status(200).json({
          success: false,
          errorType: "expired",
          message: "Seu acesso expirou! O seu plano de 1 ano venceu."
        });
      }
    }

    // Login successful
    return res.json({
      success: true,
      user: {
        email: user.email,
        plan_key: user.plan_key,
        plan_name: user.plan_name,
        is_recurring: user.is_recurring,
        access_start: user.access_start,
        access_end: user.access_end,
        no_access_end: user.no_access_end,
        active: user.active
      }
    });
  });

  // API: Get online saved projects keyed by email
  app.get("/api/projects", (req, res) => {
    const { email } = req.query;
    if (!email) {
      return res.status(200).json([]);
    }

    const normEmail = String(email).trim().toLowerCase();
    const db = loadDatabase();
    
    const userProjects = db.projects.filter(p => p.email.trim().toLowerCase() === normEmail);
    res.json(userProjects);
  });

  // API: Save/Replace online project
  app.post("/api/projects", async (req, res) => {
    const project: ProjectData = req.body;
    if (!project || !project.email || !project.id) {
      return res.status(400).json({ error: "Dados inválidos do projeto." });
    }

    const db = loadDatabase();
    const idx = db.projects.findIndex(p => p.id === project.id);
    
    const updatedProject = {
      ...project,
      email: project.email.trim().toLowerCase(),
      updatedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      db.projects[idx] = updatedProject;
    } else {
      db.projects.push(updatedProject);
    }

    await saveDatabase(db);
    res.json(updatedProject);
  });

  // API: Delete online project
  app.delete("/api/projects/:id", async (req, res) => {
    const { id } = req.params;
    const { email } = req.query;

    if (!id || !email) {
      return res.status(400).json({ error: "ID ou E-mail não fornecidos" });
    }

    const normEmail = String(email).trim().toLowerCase();
    const db = loadDatabase();
    
    db.projects = db.projects.filter(p => !(p.id === id && p.email.trim().toLowerCase() === normEmail));
    await saveDatabase(db);

    res.json({ success: true });
  });

  // API Webhook listeners - Supports /api/webhook and /lowify/v1/webhook
  const webhookHandler = async (req: express.Request, res: express.Response) => {
    const db = loadDatabase();
    const rawBody = JSON.stringify(req.body);
    const data = req.body || {};
    
    const email = extractEmailFromWebhook(data);
    const status = extractStatusFromWebhook(data);
    const detectedPlan = detectPlanFromWebhook(data);

    const logEntry: WebhookLog = {
      id: "wh_log_" + Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
      source: "lowify",
      email: email || "desconhecido",
      status: status || "unknown",
      plan_detected: detectedPlan.key,
      payload: data
    };

    db.webhookLogs.push(logEntry);
    if (db.webhookLogs.length > 100) {
      db.webhookLogs.shift(); // keep last 100 entries max
    }

    if (!email) {
      await saveDatabase(db);
      return res.status(200).json({ 
        ok: false, 
        message: "Webhook recebido, mas nenhum email de cliente foi identificado." 
      });
    }

    // Checkout approved payment keywords
    const approvedStatuses = [
      "approved", "paid", "completed", "aprovado", "pago", "pix_paid",
      "payment_approved", "purchase_approved", "order_paid", "success",
      "succeeded", "sale_approved", "compra_aprovada", "order.paid"
    ];

    const blockedStatuses = [
      "canceled", "cancelled", "expired", "refunded", "chargeback", "inactive", "cancelado", "reembolsado"
    ];

    const isApproved = approvedStatuses.includes(status) || !status; // Treat simple trigger as approved by default if status is empty

    if (isApproved) {
      // Liberar o acesso por 1 ano como padrão conforme instruções
      const accessStart = getTodayString();
      const accessEnd = getOneYearLaterString(accessStart);

      db.users[email] = {
        email: email,
        active: 1,
        status: status || "approved",
        source: "lowify",
        plan_key: "unlimited",
        plan_name: "Plano Único - Sem Limites",
        plan_limit: 0,
        is_recurring: 0, // Standard yearly access (has 1-year expiration)
        access_start: accessStart,
        access_end: accessEnd,
        no_access_end: 0, // blocks by expiration in 1 year
        purchase_count: 1,
        generated_count: 0,
        total_generated_count: 0,
        last_generated_at: "",
        billing_cycle_start: accessStart,
        billing_cycle_end: getOneYearLaterString(accessStart),
        next_reset_at: "",
        updated_at: new Date().toISOString()
      };

      await saveDatabase(db);

      // Trigger user forward webhook as required:
      await forwardWebhookToClient({
        event: "user.activated_via_webhook",
        email: email,
        plan: detectedPlan.key,
        source: "lowify",
        access_end: accessEnd
      });

      return res.status(200).json({
        ok: true,
        message: `Acesso liberado com sucesso por 1 ano para o email ${email}. Plano: ${detectedPlan.name}`
      });
    }

    if (blockedStatuses.includes(status)) {
      if (db.users[email]) {
        db.users[email].active = 0;
        db.users[email].status = "blocked_by_webhook_" + status;
        db.users[email].updated_at = new Date().toISOString();
        await saveDatabase(db);

        await forwardWebhookToClient({
          event: "user.deactivated_via_webhook",
          email: email,
          status: status
        });

        return res.status(200).json({
          ok: true,
          message: `Acesso do e-mail ${email} foi suspenso devido a reembolso ou expiração.`
        });
      }
    }

    await saveDatabase(db);
    return res.status(200).json({
      ok: true,
      message: "Webhook registrado sem alterações necessárias de acesso."
    });
  };

  app.post("/api/webhook", webhookHandler);
  app.post("/lowify/v1/webhook", webhookHandler);

  // Admin APIs - Guarded by security check
  app.get("/api/admin/data", (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== "admin123@resina.com") {
      return res.status(403).json({ error: "Acesso administrativo negado." });
    }

    const db = loadDatabase();
    res.json({
      users: Object.values(db.users),
      webhookLogs: db.webhookLogs,
      blockedLogs: db.blockedLogs
    });
  });

  // Admin API: Create or update user manually
  app.post("/api/admin/users", async (req, res) => {
    const { admin_email, user } = req.body;
    if (admin_email !== "admin123@resina.com" || !user || !user.email) {
      return res.status(403).json({ error: "Acesso administrativo negado." });
    }

    const db = loadDatabase();
    const emailKey = user.email.trim().toLowerCase();

    const planLimits: Record<string, number> = {
      basic: 50,
      starter: 150,
      unlimited: 0
    };

    const isNew = !db.users[emailKey];

    const existing = (db.users[emailKey] || {}) as any;
    db.users[emailKey] = {
      email: user.email.trim(),
      active: user.active !== undefined ? Number(user.active) : 1,
      status: user.status || "approved",
      source: user.source || "manual",
      plan_key: "unlimited",
      plan_name: "Plano Único - Sem Limites",
      plan_limit: 0,
      is_recurring: user.is_recurring !== undefined ? Number(user.is_recurring) : 0,
      access_start: user.access_start || existing.access_start || getTodayString(),
      access_end: user.access_end || "",
      no_access_end: user.no_access_end !== undefined ? Number(user.no_access_end) : 0,
      purchase_count: Number(user.purchase_count) || existing.purchase_count || 1,
      generated_count: user.generated_count !== undefined ? Number(user.generated_count) : (existing.generated_count || 0),
      total_generated_count: user.total_generated_count !== undefined ? Number(user.total_generated_count) : (existing.total_generated_count || 0),
      last_generated_at: user.last_generated_at || existing.last_generated_at || "",
      billing_cycle_start: user.billing_cycle_start || existing.billing_cycle_start || getTodayString(),
      billing_cycle_end: user.billing_cycle_end || existing.billing_cycle_end || "",
      next_reset_at: user.next_reset_at || existing.next_reset_at || "",
      updated_at: new Date().toISOString()
    };

    await saveDatabase(db);

    // Forward manual creation webhook to client URL too:
    await forwardWebhookToClient({
      event: isNew ? "admin.user_created" : "admin.user_updated",
      email: emailKey,
      user_details: db.users[emailKey]
    });

    res.json({ success: true, user: db.users[emailKey] });
  });

  // Admin API: Delete user manually
  app.delete("/api/admin/users/:email", async (req, res) => {
    const { email } = req.params;
    const { admin_email } = req.query;

    if (admin_email !== "admin123@resina.com" || !email) {
      return res.status(403).json({ error: "Acesso administrativo negado." });
    }

    const db = loadDatabase();
    const destEmail = email.trim().toLowerCase();
    
    if (db.users[destEmail]) {
      delete db.users[destEmail];
      await saveDatabase(db);

      // Trigger deletion webhook forwarding too:
      await forwardWebhookToClient({
        event: "admin.user_deleted",
        email: destEmail
      });
      return res.json({ success: true });
    }

    res.status(404).json({ error: "Usuário não encontrado." });
  });

  // Track page image generation
  app.post("/api/track-generation", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "E-mail não fornecido" });
    }

    const normEmail = email.trim().toLowerCase();
    const db = loadDatabase();
    const user = db.users[normEmail];

    if (!user) {
      db.blockedLogs.push({
        date: new Date().toISOString(),
        email: normEmail,
        reason: "Image tracking - email não cadastrado",
        ip: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown"
      });
      await saveDatabase(db);
      return res.status(403).json({ error: "E-mail de acesso não encontrado." });
    }

    user.generated_count = (user.generated_count || 0) + 1;
    user.total_generated_count = (user.total_generated_count || 0) + 1;
    user.last_generated_at = new Date().toISOString();
    user.updated_at = new Date().toISOString();
    
    await saveDatabase(db);
    res.json({ 
      success: true, 
      generated_count: user.generated_count, 
      total_generated_count: user.total_generated_count 
    });
  });

  // Vite preview compiler middleware for Dev environment, and static fallback client in Production environment
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    if (firestore) {
      try {
        await hydrateFromFirestore();
      } catch (err) {
        console.error("Direct hydration on startup failed:", err);
      }
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Express custom server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
