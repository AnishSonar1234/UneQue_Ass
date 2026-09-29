import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { config } from "./config";
import { initStore, getLeads, closeStore, addLead, haslead } from "./store";
import { createWss, getClientCount, broadcastLead } from "./ws";
import { createWebhookRouter } from "./webhook";

async function bootstrap() {
  await initStore();

  const app = express();

  // CORS for dev
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Apply express.raw() ONLY to POST /webhook so signature verification works
  app.use(
    "/webhook",
    (req: Request, res: Response, next: NextFunction) => {
      if (req.method === "POST") {
        express.raw({ type: "*/*", limit: "5mb" })(req, res, next);
      } else {
        next();
      }
    }
  );

  // JSON body parser for everything else
  app.use(express.json());

  // Routes
  app.use("/webhook", createWebhookRouter());

  // GET /leads
  app.get("/leads", (req: Request, res: Response) => {
    const since = req.query.since as string | undefined;
    const leads = getLeads(since);
    res.json(leads);
  });

  // GET /health
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true, clients: getClientCount() });
  });

  // POST /dev/simulate — inject fake lead without Meta
  if (!config.isProduction) {
    app.post("/dev/simulate", async (req: Request, res: Response) => {
      const body = req.body ?? {};
      const leadgenId: string = body.leadgen_id ?? `sim_${Date.now()}`;
      const formId: string = body.form_id ?? "sim_form_001";
      const pageId: string = body.page_id ?? "sim_page_001";
      const createdTime: number = body.created_time ?? Math.floor(Date.now() / 1000);

      // Build a fake lead directly (skip Graph API)

      if (haslead(leadgenId)) {
        res.status(409).json({ error: "Duplicate leadgen_id" });
        return;
      }

      const fields: Record<string, string> = body.fields ?? {
        full_name: "Test User",
        email: "test@example.com",
        phone_number: "+1-555-0100",
      };

      const lead = {
        id: leadgenId,
        formId,
        pageId,
        createdTime,
        receivedAt: new Date().toISOString(),
        fields,
        status: "ok" as const,
      };

      addLead(lead);
      broadcastLead(lead);
      console.log(`[dev/simulate] Injected fake lead: ${leadgenId}`);
      res.status(201).json({ ok: true, lead });
    });
  }

  // Central error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[server] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  // Create HTTP server and attach WebSocket
  const server = http.createServer(app);
  createWss(server);

  server.listen(config.port, () => {
    console.log(`[server] Listening on http://localhost:${config.port}`);
    console.log(`[server] ENV: ${config.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("[server] Shutting down...");
    closeStore();
    server.close(() => {
      console.log("[server] Closed");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
