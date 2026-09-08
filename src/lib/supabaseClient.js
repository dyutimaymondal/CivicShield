import { createClient } from "@supabase/supabase-js";

// Resilient fallback defaults for public/client deployment (e.g. Vercel without manual env vars configured)
const DEFAULT_SUPABASE_URL = "https://gjalxjixzalxlxmlpaoz.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_PjscnZoTkBI6NqT25eUQlw_TO2zK9JN";

const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
const supabasePublishableKey = (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_KEY).trim();

function initSupabaseClient() {
  try {
    return createClient(supabaseUrl, supabasePublishableKey);
  } catch (err) {
    console.warn("Supabase client initialization warning (using resilient fallback):", err.message);
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ error: { message: "Authentication service initializing." } }),
        signUp: async () => ({ error: { message: "Authentication service initializing." } }),
        signOut: async () => ({ error: null }),
        resetPasswordForEmail: async () => ({ error: null }),
        updateUser: async () => ({ error: null })
      },
      from: () => ({
        select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null })
      }),
      storage: {
        from: () => ({
          upload: async () => ({ error: { message: "Storage offline" } }),
          getPublicUrl: () => ({ data: { publicUrl: "" } })
        })
      },
      functions: {
        invoke: async () => ({ data: null, error: { message: "Edge functions unavailable" } })
      }
    };
  }
}

export const supabase = initSupabaseClient();