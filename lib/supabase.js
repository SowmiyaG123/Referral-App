import { createClient } from "@supabase/supabase-js";

// ✅ Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Missing Supabase environment variables. Check .env.local");
}

// ✅ Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✅ Utility: Get current user
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

// ✅ Utility: Get current session
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

// ✅ Utility: Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ✅ Utility: Check if user is verified
export async function isVerified() {
  const user = await getUser();
  return Boolean(user?.email_confirmed_at);
}
