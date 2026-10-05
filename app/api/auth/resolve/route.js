import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeUsername, isValidUsername } from "@/lib/username";
import { rateLimit, clientIp, tooMany } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// يحوّل اسم المستخدم إلى البريد الداخلي لتسجيل الدخول
export async function POST(request) {
  const rl = rateLimit("resolve:" + clientIp(request), 40, 60 * 1000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const body = await request.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  if (!isValidUsername(username)) return Response.json({ error: "غير موجود" }, { status: 404 });
  let admin;
  try { admin = getSupabaseAdmin(); } catch { return Response.json({ error: "إعدادات الخادم ناقصة" }, { status: 500 }); }
  const { data } = await admin.from("usernames").select("login_email").eq("username_lower", username).maybeSingle();
  if (!data) return Response.json({ error: "غير موجود" }, { status: 404 });
  return Response.json({ email: data.login_email });
}
