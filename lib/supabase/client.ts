import { createBrowserClient } from "@supabase/ssr";

/**
 * Publishable (browser) key: prefer NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 * Also accept NEXT_PUBLIC_SUPABASE_ANON_KEY (common Supabase / older project name).
 */
function resolveSupabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    undefined
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = resolveSupabaseKey();

export function getSupabaseConfigError(): string | null {
  if (!supabaseUrl && !supabaseKey) {
    return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local.";
  }
  if (!supabaseUrl) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.";
  }
  if (!supabaseKey) {
    return "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local.";
  }
  return null;
}

export function createClient() {
  const configError = getSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  return createBrowserClient(supabaseUrl!, supabaseKey!);
}

export function createClientSafe() {
  const configError = getSupabaseConfigError();
  if (configError) {
    return null;
  }

  return createBrowserClient(supabaseUrl!, supabaseKey!);
}
