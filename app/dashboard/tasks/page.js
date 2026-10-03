"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useUI } from "@/components/UIProvider";
import { useRefresh } from "@/components/RefreshProvider";
import ConfirmModal from "@/components/ConfirmModal";
import { dayLabel, formatDate, daysFromToday } from "@/lib/format";

const PRIORITY = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function TasksPage() {
  const { user } = useAuth();
  const { showLoading, hideLoading, showToast } = useUI();
  const { registerHandler } = useRefresh();

  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("open");
  const [quick, setQuick] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("tasks").select("*").eq("user_id", user.id);
    setTasks(data || []);
    setLoaded(true);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => registerHandler(load), [registerHandler, load]);

  function openAdd() { setEditId(null); setTitle(""); setPriority("medium"); setDueDate(""); setError(""); setShowModal(true); }
  function openEdit(t) { setEditId(t.id); setTitle(t.title); setPriority(t.priority); setDueDate(t.due_date || ""); setError(""); setShowModal(true); }

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      openAdd();
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // إضافة سريعة: اكتب المهمة واضغط Enter
  async function handleQuickAdd(e) {
    e.preventDefault();
    const t = quick.trim();
    if (!t) return;
    setQuick("");
    const { error: err } = await supabase.from("tasks").insert({ user_id: user.id, title: t, priority: "medium" });
    if (err) { showToast("حدث خطأ أثناء الإضافة.", "error"); setQuick(t); return; }
    load();
  }

  async function toggleDone(t) {
    const done = !t.done;
    // تحديث فوري في الواجهة
    setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, done } : x)));
    const { error: err } = await supabase.from("tasks")
      .update({ done, completed_at: done ? new Date().toISOString() : null })
      .eq("id", t.id).eq("user_id", user.id);
    if (err) { showToast("حدث خطأ.", "error"); load(); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (!title.trim()) { setError("الرجاء كتابة المهمة."); return; }
    setSubmitting(true);
    showLoading();
    const payload = { title: title.trim(), priority, due_date: dueDate || null };
    let err;
    if (editId) ({ error: err } = await supabase.from("tasks").update(payload).eq("id", editId).eq("user_id", user.id));
    else ({ error: err } = await supabase.from("tasks").insert({ ...payload, user_id: user.id }));
    hideLoading();
    setSubmitting(false);
    if (err) { setError("حدث خطأ أثناء الحفظ."); return; }
    showToast(editId ? "تم تعديل المهمة." : "تمت إضافة المهمة.", "success");
    setShowModal(false);
    load();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    showLoading();
    const { error: err } = await supabase.from("tasks").delete().eq("id", confirmDelete.id).eq("user_id", user.id);
    hideLoading();
    setConfirmDelete(null);
    if (err) { showToast("حدث خطأ أثناء الحذف.", "error"); return; }
    showToast("تم حذف المهمة.", "success");
    load();
  }

  async function clearDone() {
    showLoading();
    const { error: err } = await supabase.from("tasks").delete().eq("user_id", user.id).eq("done", true);
    hideLoading();
    if (err) { showToast("حدث خطأ.", "error"); return; }
    showToast("تم حذف المهام المنجزة.", "success");
    load();
  }

  const { open, done } = useMemo(() => {
    const o = tasks.filter((t) => !t.done).sort((a, b) => {
      const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (p) return p;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      return a.due_date ? -1 : b.due_date ? 1 : 0;
    });
    const d = tasks.filter((t) => t.done).sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""));
    return { open: o, done: d };
  }, [tasks]);
  const list = filter === "open" ? open : done;

  return (
    <>
      <div className="section-header">
        <h3>✅ مهامي</h3>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ إضافة مهمة</button>
      </div>

      <form className="quick-add" onSubmit={handleQuickAdd}>
        <input type="text" placeholder="اكتب مهمة جديدة واضغط Enter..." value={quick} onChange={(e) => setQuick(e.target.value)} maxLength={200} />
      </form>

      <div className="tags-bar">
        <button className={"tag-chip" + (filter === "open" ? " active" : "")} onClick={() => setFilter("open")}>المتبقية ({open.length})</button>
        <button className={"tag-chip" + (filter === "done" ? " active" : "")} onClick={() => setFilter("done")}>المنجزة ({done.length})</button>
        {filter === "done" && done.length > 0 && <button className="tag-chip" onClick={clearDone}>🗑️ حذف المنجزة</button>}
      </div>

      <div className="task-list">
        {loaded && list.length === 0 && (
          <div className="empty-state">{filter === "open" ? "لا توجد مهام متبقية. 🎉" : "لا توجد مهام منجزة بعد."}</div>
        )}
        {list.map((t) => {
          const late = !t.done && t.due_date && daysFromToday(t.due_date) < 0;
          return (
            <div key={t.id} className={"task-row" + (t.done ? " done" : "")}>
              <button className={"task-check" + (t.done ? " checked" : "")} onClick={() => toggleDone(t)} aria-label={t.done ? "إلغاء الإنجاز" : "تم الإنجاز"}>
                {t.done ? "✓" : ""}
              </button>
              <div className="task-main">
                <div className="task-title">{t.title}</div>
                {t.due_date && (
                  <div className={"task-meta" + (late ? " late" : "")}>
                    📅 {formatDate(t.due_date)} · {dayLabel(t.due_date)}{late ? " (متأخرة)" : ""}
                  </div>
                )}
              </div>
              <span className={"badge prio-" + t.priority}>{PRIORITY[t.priority]}</span>
              <div className="row-actions">
                <button onClick={() => openEdit(t)} title="تعديل">✏️</button>
                <button onClick={() => setConfirmDelete(t)} title="حذف">🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{editId ? "تعديل المهمة" : "إضافة مهمة جديدة"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="field"><label>المهمة</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required autoFocus /></div>
              <div className="field">
                <label>الأولوية</label>
                <div className="checkbox-chip-group">
                  {Object.keys(PRIORITY).map((k) => (
                    <div className="checkbox-chip" key={k}>
                      <input type="radio" name="priority" id={`prio-${k}`} checked={priority === k} onChange={() => setPriority(k)} />
                      <label htmlFor={`prio-${k}`}>{PRIORITY[k]}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="field"><label>تاريخ الاستحقاق (اختياري)</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              <div className="error-text">{error}</div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal title="حذف المهمة" message="هل أنت متأكد من حذف هذه المهمة؟" onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
      )}
    </>
  );
}
