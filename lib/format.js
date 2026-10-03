// تجميع التاريخ والوقت (إن لم يوجد وقت نعتبر نهاية اليوم)
export function combineDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const t = timeStr ? (timeStr.length === 5 ? timeStr + ":00" : timeStr) : "23:59:00";
  const d = new Date(dateStr + "T" + t);
  return isNaN(d.getTime()) ? null : d;
}

export function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// عدد الأيام بين اليوم وتاريخ معيّن (سالب = فات)
export function daysFromToday(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

export function dayLabel(dateStr) {
  const n = daysFromToday(dateStr);
  if (n === null) return "";
  if (n === 0) return "اليوم";
  if (n === 1) return "غدًا";
  if (n === 2) return "بعد غد";
  if (n > 2) return `بعد ${n} يومًا`;
  if (n === -1) return "أمس";
  return `قبل ${Math.abs(n)} يومًا`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB");
}

export function formatTime(t) {
  return t ? t.slice(0, 5) : "—";
}

export function formatStamp(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB") + " - " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}
