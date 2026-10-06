import { createClient } from "@supabase/supabase-js";
import { checkUrl, checkKey, clean, explainDbError } from "@/lib/envCheck";
import { rateLimit, clientIp, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// صفحة فحص ذاتي: افتح /api/health بعد النشر لمعرفة أي إعداد فيه مشكلة (لا تكشف أي مفتاح)
export async function GET(request) {
  const rl = rateLimit("health:" + clientIp(request), 30, 60 * 1000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const url = checkUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = checkKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "anon");
  const service = checkKey(process.env.SUPABASE_SERVICE_ROLE_KEY, "service");

  const checks = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", ok: url.ok, note: url.note },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: anon.ok, note: anon.note },
    { name: "SUPABASE_SERVICE_ROLE_KEY", ok: service.ok, note: service.note },
  ];

  const withTimeout = (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(8000) });
  const opts = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: withTimeout } };

  if (url.ok && service.ok) {
    const admin = createClient(url.origin, clean(process.env.SUPABASE_SERVICE_ROLE_KEY), opts);
    const { error } = await admin.from("usernames").select("user_id").limit(1);
    checks.push({ name: "الاتصال بقاعدة البيانات (service_role + جدول usernames)", ok: !error, note: error ? explainDbError(error) : "سليم." });
    const t = await admin.from("tasks").select("id").limit(1);
    checks.push({ name: "جداول الملاحظات والمواعيد والمهام", ok: !t.error, note: t.error ? explainDbError(t.error) : "سليم." });
  } else {
    checks.push({ name: "الاتصال بقاعدة البيانات", ok: false, note: "تخطّيناه: أصلح الرابط ومفتاح service_role أولًا." });
  }

  if (url.ok && anon.ok) {
    const pub = createClient(url.origin, clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), opts);
    const { error } = await pub.from("notes").select("id").limit(1);
    checks.push({ name: "الاتصال بمفتاح anon (يستخدمه تسجيل الدخول)", ok: !error, note: error ? explainDbError(error) : "سليم." });
  } else {
    checks.push({ name: "الاتصال بمفتاح anon", ok: false, note: "تخطّيناه: أصلح الرابط ومفتاح anon أولًا." });
  }

  const ok = checks.every((c) => c.ok);
  return Response.json(
    { ok, summary: ok ? "كل شيء سليم، يمكنك إنشاء حساب." : "فيه مشاكل: راجع الفحوصات التي قيمتها false.", checks },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
