import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl?.trim()) {
  throw new Error("SUPABASE_URL is missing or empty.");
}

if (!supabaseServiceRoleKey?.trim()) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing or empty.");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: { persistSession: false },
  }
);
