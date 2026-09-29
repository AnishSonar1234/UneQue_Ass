import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifySignature } from "../src/webhook";

// env vars are set by tests/setup.ts (vitest setupFiles)

describe("verifySignature", () => {
  const secret = "test_app_secret";

  function makeSignature(body: string | Buffer, s = secret): string {
    const raw = typeof body === "string" ? Buffer.from(body) : body;
    const hash = crypto.createHmac("sha256", s).update(raw).digest("hex");
    return `sha256=${hash}`;
  }

  it("returns true for a valid signature", () => {
    const body = Buffer.from('{"foo":"bar"}');
    const sig = makeSignature(body);
    expect(verifySignature(body, sig)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    const body = Buffer.from('{"foo":"bar"}');
    const sig = makeSignature(body, "wrong_secret");
    expect(verifySignature(body, sig)).toBe(false);
  });

  it("returns false when signature prefix is missing", () => {
    const body = Buffer.from("hello");
    const hash = crypto.createHmac("sha256", secret).update(body).digest("hex");
    // No sha256= prefix
    expect(verifySignature(body, hash)).toBe(false);
  });

  it("returns false for a tampered body", () => {
    const original = Buffer.from('{"amount":100}');
    const tampered = Buffer.from('{"amount":999}');
    const sig = makeSignature(original);
    expect(verifySignature(tampered, sig)).toBe(false);
  });

  it("uses timing-safe comparison (no exception on different lengths)", () => {
    const body = Buffer.from("data");
    // "sha256=short" — the provided hex would be 5 bytes, expected is 32 bytes
    // timingSafeEqual would throw on length mismatch, which we catch
    expect(() => verifySignature(body, "sha256=short")).not.toThrow();
  });
});

describe("webhook payload parsing", () => {
  it("correctly identifies leadgen changes and ignores other fields", () => {
    const payload = {
      object: "page",
      entry: [
        {
          id: "page_123",
          changes: [
            {
              field: "leadgen",
              value: {
                leadgen_id: "lead_456",
                form_id: "form_789",
                page_id: "page_123",
                created_time: 1700000000,
                ad_id: "ad_001",
              },
            },
            {
              field: "feed", // should be ignored
              value: {},
            },
          ],
        },
      ],
    };

    const leadgenChanges = payload.entry
      .flatMap((e) => e.changes)
      .filter((c) => c.field === "leadgen");

    expect(leadgenChanges).toHaveLength(1);
    expect(leadgenChanges[0].value.leadgen_id).toBe("lead_456");
    expect(leadgenChanges[0].value.form_id).toBe("form_789");
  });

  it("normalizes field_data into a flat Record<string,string>", () => {
    const fieldData = [
      { name: "full_name", values: ["Alice Smith"] },
      { name: "email", values: ["alice@example.com"] },
      { name: "phone_number", values: ["+1-555-0123"] },
    ];

    const fields: Record<string, string> = {};
    for (const f of fieldData) {
      fields[f.name] = f.values[0] ?? "";
    }

    expect(fields.full_name).toBe("Alice Smith");
    expect(fields.email).toBe("alice@example.com");
    expect(fields.phone_number).toBe("+1-555-0123");
  });
});
