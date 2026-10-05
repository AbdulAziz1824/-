"use client";
import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://placeholder.supabase.co";

// ننظف القيمة (مسافات/علامات اقتباس/شرطة أخيرة) ونتأكد أنها رابط صحيح، وإلا نستخدم قيمة مؤقتة كي لا ينهار البناء
function cleanUrl(raw) {
  const v = String(raw || "").trim().replace(/^["']|["']$/g, "");
  try {
    const u = new URL(v);
    return /^https?:$/.test(u.protocol) ? u.origin : "";
  } catch {
    return "";
  }
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = cleanUrl(rawUrl) || FALLBACK_URL;
const supabaseAnonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "") || "placeholder-anon-key";

if (typeof window !== "undefined" && supabaseUrl === FALLBACK_URL) {
  console.error("NEXT_PUBLIC_SUPABASE_URL غير صحيح أو ناقص. يجب أن يكون مثل https://xxxx.supabase.co ثم أعد النشر.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
