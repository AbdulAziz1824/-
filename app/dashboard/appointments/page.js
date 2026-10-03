"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useUI } from "@/components/UIProvider";
import { useRefresh } from "@/components/RefreshProvider";
import ConfirmModal from "@/components/ConfirmModal";
import { combineDateTime, dayLabel, formatDate, formatTime, daysFromToday, todayStr } from "@/lib/format";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { showLoading, hideLoading, showToast } = useUI();
  const { registerHandler } = useRefresh();

  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("upcoming");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("appointments").select("*").eq("user_id", user.id);
    setItems(data || []);
    setLoaded(true);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => registerHandler(load), [registerHandler, load]);

  function openAdd() {
    setEditId(null); setTitle(""); setDate(todayStr()); setTime(""); setLocation(""); setDetails(""); setError("");
    setShowModal(true);
  }
  function openEdit(x) {
    setEditId(x.id); setTitle(x.title); setDate(x.appt_date); setTime(x.appt_time ? x.appt_time.slice(0, 5) : "");
    setLocation(x.location || ""); setDetails(x.details || ""); setError("");
    setShowModal(true);
  }

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      openAdd();
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (!title.trim() || !date) { setError("الرجاء إدخال عنوان الموعد والتاريخ."); return; }
    setSubmitting(true);
    showLoading();
    const payload = { title: title.trim(), appt_date: date, appt_time: time || null, location: location.trim() || null, details: details.trim() || null };
    let err;
    if (editId) ({ error: err } = await supabase.from("appointments").update(payload).eq("id", editId).eq("user_id", user.id));
    else ({ error: err } = await supabase.from("appointments").insert({ ...payload, user_id: user.id }));
    hideLoading();
    setSubmitting(false);
    if (err) { setError("حدث خطأ أثناء الحفظ."); return; }
    showToast(editId ? "تم تعديل الموعد." : "تمت إضافة الموعد.", "success");
    setShowModal(false);
    load();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    showLoading();
    const { error: err } = await supabase.from("appointments").delete().eq("id", confirmDelete.id).eq("user_id", user.id);
    hideLoading();
    setConfirmDelete(null);
    if (err) { showToast("حدث خطأ أثناء الحذف.", "error"); return; }
    showToast("تم حذف الموعد.", "success");
    load();
  }

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const mapped = items.map((x) => ({ ...x, dt: combineDateTime(x.appt_date, x.appt_time) }));
    return {
      upcoming: mapped.filter((x) => x.dt && x.dt >= now).sort((a, b) => a.dt - b.dt),
      past: mapped.filter((x) => !x.dt || x.dt < now).sort((a, b) => (b.dt || 0) - (a.dt || 0)),
    };
  }, [items]);
  const list = filter === "upcoming" ? upcoming : past;

  return (
    <>
      <div className="section-header">
        <h3>🗓️ مواعيدي</h3>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ إضافة موعد</button>
      </div>

      <div className="tags-bar">
        <button className={"tag-chip" + (filter === "upcoming" ? " active" : "")} onClick={() => setFilter("upcoming")}>القادمة ({upcoming.length})</button>
        <button className={"tag-chip" + (filter === "past" ? " active" : "")} onClick={() => setFilter("past")}>المنتهية ({past.length})</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>الموعد</th><th>التاريخ</th><th>الوقت</th><th>المكان</th><th>المتبقي</th><th></th></tr></thead>
          <tbody>
            {loaded && list.length === 0 && (
              <tr><td colSpan={6} className="empty-state">{filter === "upcoming" ? "لا توجد مواعيد قادمة. أضف موعدك الأول." : "لا توجد مواعيد منتهية."}</td></tr>
            )}
            {list.map((x) => (
              <tr key={x.id}>
                <td>
                  {x.title}
                  {x.details && <div className="row-sub">{x.details}</div>}
                </td>
                <td>{formatDate(x.appt_date)}</td>
                <td>{formatTime(x.appt_time)}</td>
                <td>{x.location || "—"}</td>
                <td>{filter === "past"
                  ? <span className="badge muted">انتهى</span>
                  : <span className={"badge " + (daysFromToday(x.appt_date) <= 1 ? "warn" : "accent")}>{dayLabel(x.appt_date)}</span>}</td>
                <td className="row-actions">
                  <button onClick={() => openEdit(x)} title="تعديل">✏️</button>
                  <button onClick={() => setConfirmDelete(x)} title="حذف">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{editId ? "تعديل الموعد" : "إضافة موعد جديد"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="field"><label>عنوان الموعد</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required autoFocus /></div>
              <div className="field"><label>التاريخ</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
              <div className="field"><label>الوقت (اختياري)</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
              <div className="field"><label>المكان (اختياري)</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} /></div>
              <div className="field"><label>تفاصيل (اختياري)</label><textarea value={details} onChange={(e) => setDetails(e.target.value)} /></div>
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
        <ConfirmModal title="حذف الموعد" message="هل أنت متأكد من حذف هذا الموعد؟" onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
      )}
    </>
  );
}
