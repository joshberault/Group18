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

if (urls.length === 0) {
  console.error("Set SUPABASE_DB_PASSWORD or DATABASE_URL in .env.local");
  process.exit(1);
}

const sql = readFileSync(
  resolve(root, "supabase/migrations/20260806194500_demo_workflow_rls.sql"),
  "utf8",
);

for (const url of urls) {
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log("Connected via", url.replace(/:[^:@]+@/, ":****@"));
    await client.query(sql);
    console.log("RLS migration applied.");
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

console.error("Could not connect to Postgres with available credentials.");
process.exit(1);
