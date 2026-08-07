#!/usr/bin/env node
/**
 * Applies Phase 1 + Phase 3 migrations to remote Supabase.
 * Usage: node scripts/apply-pending-migrations.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
dotenv.config({ path: resolve(root, ".env.local") });

const projectRef = "yvsaodoslmfoqcyqvyqd";
const password = process.env.SUPABASE_DB_PASSWORD;

const urls = [];
if (process.env.DATABASE_URL) urls.push(process.env.DATABASE_URL);
if (password) {
  urls.push(
    `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
  );
}

const MIGRATIONS = [
  "20260806230000_matter_lifecycle_governance.sql",
  "20260807010000_engagement_templates.sql",
  "20260807020000_client_audit_log.sql",
  "20260807040000_align_matter_engagement_status.sql",
];

if (urls.length === 0) {
  console.error("Set SUPABASE_DB_PASSWORD or DATABASE_URL in .env.local");
  process.exit(1);
}

for (const url of urls) {
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    console.log("Connected via", url.replace(/:[^:@]+@/, ":****@"));
    for (const file of MIGRATIONS) {
      const sql = readFileSync(
        resolve(root, "supabase/migrations", file),
        "utf8",
      );
      await client.query(sql);
      console.log(`Applied ${file}`);
    }
    await client.end();
    process.exit(0);
  } catch (err) {
    console.warn("Failed:", err.message);
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

console.error("Could not connect or apply migrations.");
process.exit(1);
