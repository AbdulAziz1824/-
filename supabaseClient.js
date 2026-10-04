"use client";
import { createClient } from "@supabase/supabase-js";

// قيم بديلة تمنع انهيار البناء إذا نُسيت المتغيرات؛ التطبيق لن يعمل فعليًا بدون القيم الحقيقية
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("متغيرات Supabase غير مضافة: أضف NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY ثم أعد النشر.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
