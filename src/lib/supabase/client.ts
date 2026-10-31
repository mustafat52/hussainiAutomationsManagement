import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Used for the login form and for uploading
// files straight to Supabase Storage (so big files don't go through the server).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
