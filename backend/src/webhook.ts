import crypto from "crypto";
import type { Request, Response, NextFunction, Router } from "express";
import { Router as ExpressRouter } from "express";
import { config } from "./config";
import { fetchLeadFromGraph } from "./graph";
import { addLead, haslead } from "./store";
import { broadcastLead } from "./ws";

// ─── Meta webhook payload types ──────────────────────────────────────────────
interface LeadgenValue {
  leadgen_id: string;
  form_id: string;
  page_id: string;
  created_time: number;
  ad_id?: string;
  adgroup_id?: string;
}

interface Change {
  field: string;
  value: LeadgenValue;
}

interface Entry {
  id: string;
  changes: Change[];
}

interface WebhookPayload {
  object: string;
  entry: Entry[];
}

// ─── Signature verification ───────────────────────────────────────────────────
export function verifySignature(rawBody: Buffer, signature: string): boolean {
  if (!signature.startsWith("sha256=")) return false;
  const expected = crypto
    .createHmac("sha256", config.appSecret)
    .update(rawBody)
    .digest("hex");
  const provided = signature.slice("sha256=".length);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(provided, "hex")
    );
  } catch {
    return false;
  }
}

// ─── Core lead processor (shared with /dev/simulate) ─────────────────────────
export async function processLeadgenEvent(
  leadgenId: string,
  formId: string,
  pageId: string,
  createdTime: number,
  adId?: string,
  adgroupId?: string
): Promise<void> {
  if (haslead(leadgenId)) {
    console.log(`[webhook] Duplicate lead ${leadgenId}, skipping`);
    return;
  }

  const lead = await fetchLeadFromGraph(leadgenId, pageId, formId, createdTime);
  // Overwrite any optional fields from the webhook payload if Graph didn't return them
  if (adId) lead.adId = adId;
  if (adgroupId) lead.adgroupId = adgroupId;

  addLead(lead);
  broadcastLead(lead);

  console.log(
    `[webhook] Lead ${leadgenId} processed — status: ${lead.status}, fields: ${Object.keys(lead.fields).join(", ")}`
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
export function createWebhookRouter(): Router {
  const router = ExpressRouter();

  // GET /webhook — Meta verification challenge
  router.get("/", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === config.verifyToken) {
      console.log("[webhook] Verification challenge accepted");
      res.status(200).send(String(challenge));
    } else {
      console.warn("[webhook] Verification challenge failed", { mode, token });
      res.status(403).json({ error: "Forbidden" });
    }
  });

  // POST /webhook — Receive leadgen events
  // express.raw() is applied in server.ts specifically for this route
  router.post("/", (req: Request, res: Response) => {
    const signature = req.headers["x-hub-signature-256"] as string | undefined;

    if (!signature) {
      console.warn("[webhook] Missing X-Hub-Signature-256 header");
      res.status(401).json({ error: "Missing signature" });
      return;
    }

    const rawBody: Buffer = req.body; // raw body buffer via express.raw()
    if (!verifySignature(rawBody, signature)) {
      console.warn("[webhook] Invalid signature");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    // Respond immediately so Meta doesn't retry
    res.status(200).json({ ok: true });

    // Async processing
    (async () => {
      let payload: WebhookPayload;
      try {
        payload = JSON.parse(rawBody.toString("utf8"));
      } catch {
        console.error("[webhook] Failed to parse JSON body");
        return;
      }

      if (payload.object !== "page") return;

      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== "leadgen") continue;
          const v = change.value;
          await processLeadgenEvent(
            v.leadgen_id,
            v.form_id,
            v.page_id,
            v.created_time,
            v.ad_id,
            v.adgroup_id
          );
        }
      }
    })().catch((err) => console.error("[webhook] Processing error:", err));
  });

  return router;
}
