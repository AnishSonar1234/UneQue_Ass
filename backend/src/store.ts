import fs from "fs";
import path from "path";
import readline from "readline";

export interface Lead {
  id: string;          // leadgen_id
  formId: string;
  pageId: string;
  adId?: string;
  adgroupId?: string;
  createdTime: number; // unix seconds from Meta
  receivedAt: string;  // ISO string, when we received it
  fields: Record<string, string>;
  status: "ok" | "fetch_failed";
}

const MAX_LEADS = 500;
const JSONL_PATH = path.join(process.cwd(), "leads.jsonl");

// In-memory store: ordered newest first
const leads: Lead[] = [];
const idSet = new Set<string>();

let appendStream: fs.WriteStream | null = null;

export async function initStore(): Promise<void> {
  // Load existing leads from JSONL
  if (fs.existsSync(JSONL_PATH)) {
    const rl = readline.createInterface({
      input: fs.createReadStream(JSONL_PATH),
      crlfDelay: Infinity,
    });
    const loaded: Lead[] = [];
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const lead: Lead = JSON.parse(trimmed);
        if (!idSet.has(lead.id)) {
          idSet.add(lead.id);
          loaded.push(lead);
        }
      } catch {
        // skip malformed lines
      }
    }
    // Sort oldest first, then push to leads array (we keep newest-first)
    loaded.sort((a, b) => a.createdTime - b.createdTime);
    for (const lead of loaded) {
      leads.push(lead);
    }
    // Reverse so newest is first
    leads.reverse();
    // Evict if over cap
    while (leads.length > MAX_LEADS) {
      const evicted = leads.pop();
      if (evicted) idSet.delete(evicted.id);
    }
    console.log(`[store] Loaded ${leads.length} leads from ${JSONL_PATH}`);
  }

  appendStream = fs.createWriteStream(JSONL_PATH, { flags: "a" });
}

export function haslead(id: string): boolean {
  return idSet.has(id);
}

export function addLead(lead: Lead): void {
  if (idSet.has(lead.id)) return; // dedupe

  idSet.add(lead.id);
  leads.unshift(lead); // newest first

  // Evict oldest if over cap
  if (leads.length > MAX_LEADS) {
    const evicted = leads.pop();
    if (evicted) idSet.delete(evicted.id);
  }

  // Persist
  if (appendStream) {
    appendStream.write(JSON.stringify(lead) + "\n");
  }
}

export function getLeads(since?: string): Lead[] {
  const list = leads.slice(0, 100);
  if (!since) return list;
  const sinceMs = new Date(since).getTime();
  if (isNaN(sinceMs)) return list;
  return list.filter((l) => new Date(l.receivedAt).getTime() > sinceMs);
}

export function getAllLeads(): Lead[] {
  return leads;
}

export function closeStore(): void {
  appendStream?.end();
}
