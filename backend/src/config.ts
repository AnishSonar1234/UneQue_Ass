import dotenv from "dotenv";
import path from "path";

// Only load .env file if not already set (CI/test environments set vars directly)
if (!process.env.APP_SECRET) {
  dotenv.config({ path: path.join(process.cwd(), ".env") });
}

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  verifyToken: required("VERIFY_TOKEN"),
  appSecret: required("APP_SECRET"),
  pageAccessToken: required("PAGE_ACCESS_TOKEN"),
  graphVersion: process.env.GRAPH_VERSION ?? "v21.0",
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
} as const;
