import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeUsername, isValidUsername } from "@/lib/username";
import { rateLimit, clientIp, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// إنشاء حساب باسم مستخدم (بدون بريد حقيقي): نولّد بريدًا داخليًا عشوائيًا ونربطه باسم المستخدم
const EMAIL_DOMAIN = process.env.USERNAME_EMAIL_DOMAIN || "gmail.com";

function usedHost() {
  try { return new URL(String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["\']|["\']$/g, "")).host; } catch { return "غير صالح"; }
}

export async function POST(request) {
  const rl = rateLimit("signup:" + clientIp(request), 5, 10 * 60 * 1000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const username = normalizeUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 1 || name.length > 50) return Response.json({ error: "اكتب اسمك (حتى 50 حرفًا)." }, { status: 400 });
  if (!isValidUsername(username)) return Response.json({ error: "اسم المستخدم من 3 إلى 20 حرفًا (حروف وأرقام و _ . -) بدون مسافات." }, { status: 400 });
  if (password.length < 8 || password.length > 72) return Response.json({ error: "كلمة المرور من 8 إلى 72 حرفًا." }, { status: 400 });

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return Response.json({ error: "إعدادات الخادم ناقصة: أضف SUPABASE_SERVICE_ROLE_KEY (و NEXT_PUBLIC_SUPABASE_URL) في Vercel ثم أعد النشر." }, { status: 500 });
  }
  const { data: taken, error: lookupError } = await admin.from("usernames").select("user_id").eq("username_lower", username).maybeSingle();
  if (lookupError) {
    console.error("usernames lookup failed:", lookupError.message);
    const noTable = /relation|does not exist|schema cache/i.test(lookupError.message || "");
    const badKey = /invalid api key|jwt|apikey/i.test(lookupError.message || "");
    return Response.json({ error: noTable ? "جدول usernames غير موجود: شغّل ملف supabase-setup.sql في Supabase." : badKey ? "مفتاح SUPABASE_SERVICE_ROLE_KEY غير صحيح: انسخ مفتاح service_role من Supabase." : "تعذّر الاتصال بقاعدة البيانات: تأكد من رابط Supabase والمفاتيح. (التفاصيل: " + (lookupError.message || "fetch failed") + " | النطاق المستخدم: " + usedHost() + ")" }, { status: 500 });
  }
  if (taken) return Response.json({ error: "اسم المستخدم مستخدم، اختر اسمًا آخر." }, { status: 409 });

  const loginEmail = `u${crypto.randomBytes(12).toString("hex")}@${EMAIL_DOMAIN}`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: loginEmail, password, email_confirm: true, user_metadata: { name },
  });
  if (createError || !created?.user) {
    const msg = createError?.message || "";
    console.error("createUser failed:", msg);
    const badKey = /invalid api key|jwt|not allowed|apikey/i.test(msg);
    return Response.json({ error: badKey ? "مفتاح SUPABASE_SERVICE_ROLE_KEY غير صحيح: انسخ مفتاح service_role (وليس anon) من Supabase." : "تعذّر إنشاء الحساب: " + (msg || "خطأ غير معروف") }, { status: 500 });
  }

  const { error: mapError } = await admin.from("usernames").insert({
    user_id: created.user.id, username, username_lower: username, login_email: loginEmail,
  });
  if (mapError) {
    await admin.auth.admin.deleteUser(created.user.id);
    const dup = mapError.code === "23505";
    return Response.json(
      { error: dup ? "اسم المستخدم مستخدم، اختر اسمًا آخر." : "تعذّر إنشاء الحساب. تأكد من تشغيل ملف supabase-setup.sql." },
      { status: dup ? 409 : 500 }
    );
  }
  return Response.json({ success: true, email: loginEmail });
}
