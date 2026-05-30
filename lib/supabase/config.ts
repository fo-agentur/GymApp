// Supabase connection values.
// The URL and the *publishable* (anon) key are public by design — they are
// shipped to the browser in every Supabase app and the data is protected by
// Row Level Security. They are baked in as fallbacks so the deployed app works
// out of the box; env vars (if set) always take precedence.
// The secret service_role key is NEVER placed here.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aiptokxagqthzhpmtjyk.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_eTGcjafyoyj__-qE57nFAA_V0HkoY2j";
