// فحص صيغة متغيرات Supabase (بدون أي اتصال). يُستخدم في /api/health

export function clean(v) {
  return String(v ?? "").trim().replace(/^["']|["']$/g, "");
}

function jwtRole(key) {
  try {
    const part = key.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return json.role || null;
  } catch {
    return null;
  }
}

export function checkUrl(raw) {
  const v = clean(raw);
  if (!v) return { ok: false, note: "غير موجود: أضف NEXT_PUBLIC_SUPABASE_URL ثم أعد النشر." };
  let u;
  try { u = new URL(v); } catch {
    return { ok: false, note: "ليس رابطًا صحيحًا. يجب أن يبدأ بـ https:// ويكون مثل https://abcdefgh.supabase.co" };
  }
  if (u.protocol !== "https:") return { ok: false, note: "يجب أن يبدأ الرابط بـ https://" };
  if (/your-project-id/i.test(u.host)) return { ok: false, note: "هذا رابط المثال الوهمي: ضع رابط مشروعك الحقيقي من Supabase (Project Settings > API)." };
  if (/(^|\.)supabase\.com$/i.test(u.host)) return { ok: false, note: "هذا رابط لوحة التحكم وليس رابط المشروع. الصحيح ينتهي بـ .supabase.co" };
  const extra = (u.pathname && u.pathname !== "/") || u.search || u.hash;
  const warnHost = u.host.endsWith(".supabase.co") ? "" : ` (النطاق ${u.host} لا ينتهي بـ .supabase.co، تأكد منه)`;
  return {
    ok: true,
    origin: u.origin,
    note: (extra ? "فيه مسار زائد بعد النطاق (يتجاهله الموقع، لكن الأفضل حذفه)." : "سليم.") + warnHost,
  };
}

export function checkKey(raw, kind) {
  const label = kind === "anon" ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : "SUPABASE_SERVICE_ROLE_KEY";
  const v = clean(raw);
  if (!v) return { ok: false, note: `غير موجود: أضف ${label} ثم أعد النشر.` };
  if (/[^\x21-\x7E]/.test(v)) return { ok: false, note: "القيمة فيها نص عربي أو مسافات: هذا نص المثال وليس المفتاح الحقيقي." };
  if (kind === "anon" && v.startsWith("sb_secret_")) return { ok: false, note: "هذا مفتاح سري! لا تضعه في متغير عام. استخدم المفتاح العام (anon / publishable) وولّد مفتاحًا سريًا جديدًا." };
  if (kind === "service" && v.startsWith("sb_publishable_")) return { ok: false, note: "هذا المفتاح العام. المطلوب المفتاح السري (service_role / secret)." };
  const isJwt = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(v);
  const isNew = v.startsWith(kind === "anon" ? "sb_publishable_" : "sb_secret_");
  if (!isJwt && !isNew) return { ok: false, note: "الشكل غير صحيح: المفتاح الصحيح طويل ويبدأ بـ eyJ (أو sb_publishable_ / sb_secret_)." };
  if (isJwt) {
    const role = jwtRole(v);
    if (kind === "service" && role === "anon") return { ok: false, note: "هذا مفتاح anon. المطلوب مفتاح service_role." };
    if (kind === "anon" && role === "service_role") return { ok: false, note: "هذا مفتاح service_role السري! لا تضعه في متغير عام. استبدله بمفتاح anon وولّد مفتاحًا جديدًا." };
  }
  return { ok: true, note: "سليم." };
}

export function explainDbError(error) {
  const m = String(error?.message || "");
  if (/does not exist|schema cache|relation/i.test(m)) return "الجداول غير موجودة: شغّل ملف supabase-setup.sql في Supabase SQL Editor.";
  if (/invalid api key|jwt|apikey/i.test(m)) return "المفتاح غير صحيح لهذا المشروع (ربما من مشروع آخر).";
  if (/invalid path/i.test(m)) return "الرابط يحتوي مسارًا خاطئًا.";
  if (/fetch failed|enotfound|econn|network|abort|timeout/i.test(m)) return "تعذّر الوصول للنطاق: تأكد من رابط المشروع.";
  return "خطأ: " + m.slice(0, 140);
}
