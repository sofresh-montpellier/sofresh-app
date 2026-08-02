import { createClient } from "@supabase/supabase-js";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const isSupabaseConfigured=Boolean(url&&key&&!key.includes("COLLE_ICI"));
export const supabase=isSupabaseConfigured?createClient(url,key):null;
