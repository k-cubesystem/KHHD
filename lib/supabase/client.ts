import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    console.warn("[Supabase] Invalid or missing NEXT_PUBLIC_SUPABASE_URL");
    // Return a dummy client or handle gracefully. 
    // Most Supabase calls will fail later, but the app won't crash during init.
    return createBrowserClient(
      supabaseUrl || "https://placeholder.supabase.co",
      supabaseKey || "placeholder",
    );
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseKey!);
  } catch (err) {
    console.error("[Supabase] Failed to initialize client:", err);
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder",
    );
  }
}
