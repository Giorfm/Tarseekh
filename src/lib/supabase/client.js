import { createBrowserClient } from '@supabase/ssr';

let clientInstance = null;

/**
 * Returns a Supabase browser client if environment variables are provided,
 * otherwise returns null so the app gracefully works in guest/offline mode.
 */
export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return clientInstance;
}
