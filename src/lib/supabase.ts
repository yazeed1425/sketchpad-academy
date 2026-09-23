import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Read-only RAG lookup against the "تحصيلي - قدرات" Supabase project's pre-embedded GAT
// question bank — separate from this app's own Prisma/SQLite database (see src/lib/db.ts).
// Lazily constructed (not at module load) so a missing config only fails the RAG lookup
// itself, never anything else that happens to import this module transitively.
const globalForSupabase = globalThis as unknown as { supabase?: SupabaseClient };

export function getSupabase(): SupabaseClient {
  if (globalForSupabase.supabase) return globalForSupabase.supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL/SUPABASE_ANON_KEY are not configured");

  const client = createClient(url, key);
  if (process.env.NODE_ENV !== "production") globalForSupabase.supabase = client;
  return client;
}
