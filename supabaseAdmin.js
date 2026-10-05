import { createClient } from "@supabase/supabase-js";

// تحذير: يستخدم المفتاح السري (Service Role)، لا تستورده أبدًا في ملف "use client".
export function getSupabaseAdmin() {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!/^https?:\/\//i.test(url) || !key) throw new Error("Supabase env vars missing or invalid");
  return createClient(url, key, { auth: { persistSession: false } });
}
