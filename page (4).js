"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useRefresh } from "@/components/RefreshProvider";
import { getGreeting } from "@/lib/greeting";
import { combineDateTime, dayLabel, formatDate, formatTime, daysFromToday } from "@/lib/format";

const PRIORITY = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function HomePage() {
  const { user, profile } = useAuth();
  const { registerHandler } = useRefresh();
  const [greeting, setGreeting] = useState(getGreeting());
  const [counts, setCounts] = useState({ notes: 0, upcoming: 0, openTasks: 0, completion: 0 });
  const [appts, setAppts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [n, a, t] = await Promise.all([
      supabase.from("notes").select("id,title,content,color,pinned,updated_at").eq("user_id", user.id).order("pinned", { ascending: false }).order("updated_at", { ascending: false }),
      supabase.from("appointments").select("*").eq("user_id", user.id),
      supabase.from("tasks").select("*").eq("user_id", user.id),
    ]);
    const allNotes = n.data || [];
    const now = new Date();
    const upcoming = (a.data || [])
      .map((x) => ({ ...x, dt: combineDateTime(x.appt_date, x.appt_time) }))
      .filter((x) => x.dt && x.dt >= now)
      .sort((x, y) => x.dt - y.dt);
    const allTasks = t.data || [];
    const open = allTasks.filter((x) => !x.done);
    const completion = allTasks.length ? Math.round(((allTasks.length - open.length) / allTasks.length) * 100) : 0;
    open.sort((x, y) => {
      const p = PRIORITY_ORDER[x.priority] - PRIORITY_ORDER[y.priority];
      if (p) return p;
      if (x.due_date && y.due_date) return x.due_date.localeCompare(y.due_date);
      return x.due_date ? -1 : y.due_date ? 1 : 0;
    });
    setCounts({ notes: allNotes.length, upcoming: upcoming.length, openTasks: open.length, completion });
    setAppts(upcoming.slice(0, 5));
    setTasks(open.slice(0, 5));
    setNotes(allNotes.slice(0, 3));
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setGreeting(getGreeting()); }, []);
  useEffect(() => registerHandler(loadData), [registerHandler, loadData]);

  return (
    <>
      <div className="welcome-card">
        <div className="welcome-title">{greeting}، <b>{profile?.name || ""}</b> 👋</div>
        <div className="welcome-sub">أهلًا بك في دفتري، ملاحظاتك ومواعيدك ومهامك في مكان واحد.</div>
      </div>

      <div className="quick-actions">
        <Link href="/dashboard/notes?new=1" className="quick-btn">📝 ملاحظة جديدة</Link>
        <Link href="/dashboard/appointments?new=1" className="quick-btn">🗓️ موعد جديد</Link>
        <Link href="/dashboard/tasks?new=1" className="quick-btn">✅ مهمة جديدة</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{counts.notes}</div><div className="stat-label">الملاحظات</div></div>
        <div className="stat-card accent"><div className="stat-value">{counts.upcoming}</div><div className="stat-label">مواعيد قادمة</div></div>
        <div className="stat-card warning"><div className="stat-value">{counts.openTasks}</div><div className="stat-label">مهام متبقية</div></div>
        <div className="stat-card accent"><div className="stat-value">{counts.completion}%</div><div className="stat-label">نسبة إنجاز المهام</div></div>
      </div>

      <section className="section">
        <div className="section-header"><h3>🗓️ مواعيدي القادمة</h3><Link href="/dashboard/appointments" className="see-all">عرض الكل</Link></div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>الموعد</th><th>التاريخ</th><th>الوقت</th><th>المتبقي</th></tr></thead>
            <tbody>
              {appts.length === 0 && <tr><td colSpan={4} className="empty-state">لا توجد مواعيد قادمة.</td></tr>}
              {appts.map((x) => (
                <tr key={x.id}>
                  <td>{x.title}</td>
                  <td>{formatDate(x.appt_date)}</td>
                  <td>{formatTime(x.appt_time)}</td>
                  <td><span className={"badge " + (daysFromToday(x.appt_date) <= 1 ? "warn" : "accent")}>{dayLabel(x.appt_date)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h3>✅ مهامي المتبقية</h3><Link href="/dashboard/tasks" className="see-all">عرض الكل</Link></div>
        <div className="task-list">
          {tasks.length === 0 && <div className="empty-state">لا توجد مهام متبقية، أحسنت! 🎉</div>}
          {tasks.map((x) => (
            <div key={x.id} className="task-row">
              <span className={"prio-dot " + x.priority} />
              <div className="task-main">
                <div className="task-title">{x.title}</div>
                {x.due_date && <div className="task-meta">📅 {formatDate(x.due_date)} · {dayLabel(x.due_date)}</div>}
              </div>
              <span className={"badge prio-" + x.priority}>{PRIORITY[x.priority]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h3>📝 آخر الملاحظات</h3><Link href="/dashboard/notes" className="see-all">عرض الكل</Link></div>
        <div className="notes-grid">
          {notes.length === 0 && <div className="empty-state" style={{ gridColumn: "1/-1" }}>لا توجد ملاحظات بعد.</div>}
          {notes.map((n) => (
            <Link key={n.id} href="/dashboard/notes" className={"note-card c-" + (n.color || "none")}>
              {n.title && <div className="note-title">{n.pinned ? "📌 " : ""}{n.title}</div>}
              <div className="note-text note-clamp">{n.content}</div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
