import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "YOUR_SUPABASE_URL" &&
    !supabaseUrl.includes("placeholder")
);

let client: SupabaseClient;

try {
  const url = isSupabaseConfigured ? supabaseUrl : "https://placeholder.supabase.co";
  const key = isSupabaseConfigured
    ? supabaseAnonKey
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

  client = createClient(url, key);
  if (!isSupabaseConfigured) {
    console.warn(
      "⚠️ Missing Supabase VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env variables. Operating with fallback client."
    );
  }
} catch (err) {
  console.error("Failed to initialize Supabase client:", err);
  client = createClient(
    "https://placeholder.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder"
  );
}

export const supabase = client;

