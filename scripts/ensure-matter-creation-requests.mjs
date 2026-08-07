#!/usr/bin/env node
/**
 * Ensures matter_creation_requests exists in Supabase.
 * Tries DATABASE_URL / SUPABASE_DB_PASSWORD first, then service-role SQL API fallbacks.
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
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

const sql = readFileSync(
  resolve(root, "supabase/migrations/20260806240000_matter_creation_requests.sql"),
  "utf8",
);

async function tableExists() {
  if (!SERVICE_KEY) return false;
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await sb.from("matter_creation_requests").select("id").limit(1);
  return !error;
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
      await client.query(sql);
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
  if (await tableExists()) {
    console.log("matter_creation_requests table already exists.");
    process.exit(0);
  }

  console.log("matter_creation_requests missing — applying migration…");
  const applied = await applyWithPg();
  if (!applied) {
    console.error(
      "\nCould not apply migration automatically.\n" +
        "Add SUPABASE_DB_PASSWORD or DATABASE_URL to .env.local, then run:\n" +
        "  node scripts/ensure-matter-creation-requests.mjs\n\n" +
        "Or paste supabase/migrations/20260806240000_matter_creation_requests.sql into the Supabase SQL editor.\n",
    );
    process.exit(1);
  }

  if (await tableExists()) {
    console.log("Migration applied successfully.");
    process.exit(0);
  }

  console.error("Migration ran but table is still missing. Check Supabase logs.");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
