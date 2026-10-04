// تحديد معدل بسيط داخل الذاكرة (حماية من التكرار السريع/التخمين).
// ملاحظة: كل نسخة خادم لها ذاكرتها، فهو حاجز أول وليس حماية مطلقة.
const buckets = new Map();

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || b.reset <= now) { b = { count: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.count += 1;
  return { ok: b.count <= limit, retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)) };
}

export function clientIp(request) {
  const fwd = request.headers.get("x-forwarded-for") || "";
  return (fwd.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim().slice(0, 64);
}

export function tooMany(retryAfter) {
  return Response.json({ error: "محاولات كثيرة، حاول بعد قليل." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}
