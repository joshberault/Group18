#!/usr/bin/env node
/**
 * Ensures engagement_templates and engagement_amendments exist in Supabase.
 * Tries DATABASE_URL / SUPABASE_DB_PASSWORD first.
 *
 * Usage: node scripts/ensure-engagement-tables.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const projectRef = "yvsaodoslmfoqcyqvyqd";

for (const file of [".env.local", ".env"]) {
  const path = resolve(root, file);
  if (existsSync(path)) dotenv.config({ path });
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  `https://${projectRef}.supabase.co`;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const MIGRATIONS = [
  "20260806230000_matter_lifecycle_governance.sql",
  "20260807010000_engagement_templates.sql",
];

async function tablesExist() {
  if (!SUPABASE_KEY) return false;
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const templates = await sb.from("engagement_templates").select("id").limit(1);
  const amendments = await sb.from("engagement_amendments").select("id").limit(1);
  return !templates.error && !amendments.error;
}

async function applyWithPg() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const urls = [];
  if (process.env.DATABASE_URL) urls.push(process.env.DATABASE_URL);
  if (password) {
    urls.push(
      `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`,
      `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
    );
  }

  for (const url of urls) {
    const client = new pg.Client({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      for (const file of MIGRATIONS) {
        const sql = readFileSync(
          resolve(root, "supabase/migrations", file),
          "utf8",
        );
        await client.query(sql);
        console.log(`Applied ${file}`);
      }
      await client.end();
      return true;
    } catch (err) {
      console.warn("Postgres attempt failed:", err.message);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  return false;
}

async function main() {
  if (await tablesExist()) {
    console.log("engagement_templates and engagement_amendments already exist.");
    process.exit(0);
  }

  console.log("Engagement tables missing — applying migrations…");
  const applied = await applyWithPg();
  if (!applied) {
    console.error(
      "\nCould not apply migrations automatically.\n" +
        "Add SUPABASE_DB_PASSWORD or DATABASE_URL to .env.local, then run:\n" +
        "  node scripts/ensure-engagement-tables.mjs\n\n" +
        "Or paste these files into the Supabase SQL editor (in order):\n" +
        "  supabase/migrations/20260806230000_matter_lifecycle_governance.sql\n" +
        "  supabase/migrations/20260807010000_engagement_templates.sql\n\n" +
        `SQL editor: https://supabase.com/dashboard/project/${projectRef}/sql/new\n`,
    );
    process.exit(1);
  }

  if (await tablesExist()) {
    console.log("Engagement tables created successfully.");
    process.exit(0);
  }

  console.error("Migration ran but tables are still missing. Check Supabase logs.");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
