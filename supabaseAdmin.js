import { createClient } from "@supabase/supabase-js";

// نأخذ النطاق فقط (https://xxxx.supabase.co) ونتجاهل أي مسار أو شرطة زائدة
function cleanOrigin(raw) {
  const v = String(raw || "").trim().replace(/^["']|["']$/g, "");
  try {
    const u = new URL(v);
    return /^https?:$/.test(u.protocol) ? u.origin : "";
  } catch {
    return "";
  }
}

// تحذير: يستخدم المفتاح السري (Service Role)، لا تستورده أبدًا في ملف "use client".
export function getSupabaseAdmin() {
  const url = cleanOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!url || !key) throw new Error("Supabase env vars missing or invalid");
  return createClient(url, key, { auth: { persistSession: false } });
}
