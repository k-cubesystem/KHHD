import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Supabase Client] CRITICAL: Missing environment variables!");
    console.error("Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    throw new Error("Supabase configuration is missing. Please check your environment variables.");
  }

  if (!supabaseUrl.startsWith('http')) {
    console.error("[Supabase Client] Invalid SUPABASE_URL:", supabaseUrl);
    throw new Error("Invalid Supabase URL format");
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
