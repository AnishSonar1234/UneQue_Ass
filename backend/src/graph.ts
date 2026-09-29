import { config } from "./config";
import type { Lead } from "./store";

interface GraphFieldData {
  name: string;
  values: string[];
}

interface GraphLeadResponse {
  id: string;
  form_id: string;
  ad_id?: string;
  adgroup_id?: string;
  created_time: string; // ISO
  field_data: GraphFieldData[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchLeadFromGraph(
  leadgenId: string,
  pageId: string,
  formId: string,
  rawCreatedTime?: number
): Promise<Lead> {
  const url = `https://graph.facebook.com/${config.graphVersion}/${leadgenId}?access_token=${config.pageAccessToken}`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await sleep(1000 * 2 ** (attempt - 1)); // 1s, 2s
    }
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Graph API returned ${res.status}: ${body}`);
      }
      const data = (await res.json()) as GraphLeadResponse;

      const fields: Record<string, string> = {};
      for (const f of data.field_data ?? []) {
        fields[f.name] = f.values[0] ?? "";
      }

      const lead: Lead = {
        id: leadgenId,
        formId: data.form_id ?? formId,
        pageId,
        adId: data.ad_id,
        adgroupId: data.adgroup_id,
        createdTime: rawCreatedTime ?? Math.floor(Date.parse(data.created_time) / 1000),
        receivedAt: new Date().toISOString(),
        fields,
        status: "ok",
      };

      return lead;
    } catch (err) {
      lastError = err;
      console.error(`[graph] Attempt ${attempt + 1} failed for lead ${leadgenId}:`, err);
    }
  }

  // All retries failed — return a degraded lead
  console.error(`[graph] All retries exhausted for lead ${leadgenId}`);
  return {
    id: leadgenId,
    formId,
    pageId,
    createdTime: rawCreatedTime ?? Math.floor(Date.now() / 1000),
    receivedAt: new Date().toISOString(),
    fields: {},
    status: "fetch_failed",
  };
}
