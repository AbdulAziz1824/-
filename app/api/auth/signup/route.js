import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeUsername, isValidUsername } from "@/lib/username";
import { rateLimit, clientIp, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const EMAIL_DOMAIN = process.env.USERNAME_EMAIL_DOMAIN || "gmail.com";

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
    return Response.json({ error: "إعدادات الخادم ناقصة: أضف SUPABASE_SERVICE_ROLE_KEY في Vercel ثم أعد النشر." }, { status: 500 });
  }

  const { data: taken, error: lookupError } = await admin
    .from("usernames").select("user_id").eq("username_lower", username).maybeSingle();
  if (lookupError) {
    console.error("usernames lookup failed:", lookupError.message);
    return Response.json({ error: "خطأ في قاعدة البيانات: " + lookupError.message }, { status: 500 });
  }
  if (taken) return Response.json({ error: "اسم المستخدم مستخدم، اختر اسمًا آخر." }, { status: 409 });

  const loginEmail = `u${crypto.randomBytes(12).toString("hex")}@${EMAIL_DOMAIN}`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: loginEmail, password, email_confirm: true, user_metadata: { name },
  });
  if (createError || !created?.user) {
    const msg = createError?.message
