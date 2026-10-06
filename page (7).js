"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useUI } from "@/components/UIProvider";
import { useRefresh } from "@/components/RefreshProvider";
import ConfirmModal from "@/components/ConfirmModal";
import { formatStamp } from "@/lib/format";

const COLORS = [
  { key: "none", label: "بدون" },
  { key: "green", label: "أخضر" },
  { key: "yellow", label: "أصفر" },
  { key: "red", label: "أحمر" },
  { key: "blue", label: "أزرق" },
  { key: "purple", label: "بنفسجي" },
];

export default function NotesPage() {
  const { user } = useAuth();
  const { showLoading, hideLoading, showToast } = useUI();
  const { registerHandler } = useRefresh();

  const [notes, setNotes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("none");
  const [pinned, setPinned] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("notes").select("*").eq("user_id", user.id)
      .order("pinned", { ascending: false }).order("updated_at", { ascending: false });
    setNotes(data || []);
    setLoaded(true);
  }, [user]);

  useEffect(() => { loadNotes(); }, [loadNotes]);
  useEffect(() => registerHandler(loadNotes), [registerHandler, loadNotes]);

  function openAdd() {
    setEditId(null); setTitle(""); setContent(""); setColor("none"); setPinned(false); setTags([]); setTagInput("");
    setShowModal(true);
  }
  function openEdit(n) {
    setEditId(n.id); setTitle(n.title || ""); setContent(n.content || ""); setColor(n.color || "none");
    setPinned(!!n.pinned); setTags(n.tags || []); setTagInput("");
    setShowModal(true);
  }

  // فتح نافذة الإضافة من الاختصارات في الرئيسية (?new=1)
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      openAdd();
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function addTag(raw) {
    const t = (raw || "").trim().replace(/^#/, "");
    if (!t) return;
    setTags((prev) => (prev.includes(t) || prev.length >= 10 ? prev : [...prev, t]));
    setTagInput("");
  }
  function onTagKeyDown(e) {
    if (e.key === "Enter" || e.key === "," || e.key === "،") { e.preventDefault(); addTag(tagInput); }
    else if (e.key === "Backspace" && !tagInput && tags.length) setTags((prev) => prev.slice(0, -1));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim() && !content.trim()) { showToast("اكتب عنوانًا أو نصًا للملاحظة.", "error"); return; }
    setSubmitting(true);
    showLoading();
    const pending = tagInput.trim().replace(/^#/, "");
    const finalTags = pending && !tags.includes(pending) ? [...tags, pending] : tags;
    const payload = { title: title.trim() || null, content: content.trim(), color, pinned, tags: finalTags };
    let error;
    if (editId) {
      ({ error } = await supabase.from("notes").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editId).eq("user_id", user.id));
    } else {
      ({ error } = await supabase.from("notes").insert({ ...payload, user_id: user.id }));
    }
    hideLoading();
    setSubmitting(false);
    if (error) { showToast("حدث خطأ أثناء الحفظ.", "error"); return; }
    showToast(editId ? "تم تعديل الملاحظة." : "تمت إضافة الملاحظة.", "success");
    setShowModal(false);
    loadNotes();
  }

  async function togglePin(n) {
    const { error } = await supabase.from("notes").update({ pinned: !n.pinned }).eq("id", n.id).eq("user_id", user.id);
    if (error) { showToast("حدث خطأ.", "error"); return; }
    loadNotes();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    showLoading();
    const { error } = await supabase.from("notes").delete().eq("id", confirmDelete.id).eq("user_id", user.id);
    hideLoading();
    setConfirmDelete(null);
    if (error) { showToast("حدث خطأ أثناء الحذف.", "error"); return; }
    showToast("تم حذف الملاحظة.", "success");
    loadNotes();
  }

  const allTags = useMemo(() => Array.from(new Set(notes.flatMap((n) => n.tags || []))), [notes]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (activeTag && !(n.tags || []).includes(activeTag)) return false;
      if (!q) return true;
      return (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q);
    });
  }, [notes, search, activeTag]);

  return (
    <>
      <div className="section-header">
        <h3>📝 ملاحظاتي</h3>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ إضافة ملاحظة</button>
      </div>

      <div className="filters-bar">
        <input type="search" placeholder="ابحث في الملاحظات..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {allTags.length > 0 && (
          <select value={activeTag} onChange={(e) => setActiveTag(e.target.value)} aria-label="التاغ">
            <option value="">كل التاغات</option>
            {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
          </select>
        )}
      </div>

      <div className="notes-grid">
        {loaded && notes.length === 0 && <div className="empty-state" style={{ gridColumn: "1/-1" }}>لا توجد ملاحظات بعد. أضف ملاحظتك الأولى!</div>}
        {notes.length > 0 && visible.length === 0 && <div className="empty-state" style={{ gridColumn: "1/-1" }}>لا توجد نتائج مطابقة.</div>}
        {visible.map((n) => (
          <div key={n.id} className={"note-card c-" + (n.color || "none")}>
            {n.title && <div className="note-title">{n.pinned ? "📌 " : ""}{n.title}</div>}
            {!n.title && n.pinned && <div className="note-title">📌</div>}
            {(n.tags || []).length > 0 && (
              <div className="note-tags">
                {n.tags.map((t) => <span key={t} className="tag-chip small" onClick={() => setActiveTag(t)}>#{t}</span>)}
              </div>
            )}
            {n.content && <div className="note-text">{n.content}</div>}
            <div className="note-date">🕒 {formatStamp(n.updated_at || n.created_at)}</div>
            <div className="note-actions">
              <button onClick={() => togglePin(n)}>{n.pinned ? "إلغاء التثبيت" : "📌 تثبيت"}</button>
              <button onClick={() => openEdit(n)}>✏️ تعديل</button>
              <button onClick={() => setConfirmDelete(n)}>🗑️ حذف</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{editId ? "تعديل الملاحظة" : "إضافة ملاحظة"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="field"><label>العنوان (اختياري)</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} /></div>
              <div className="field"><label>النص</label><textarea style={{ minHeight: 140 }} value={content} onChange={(e) => setContent(e.target.value)} autoFocus /></div>
              <div className="field">
                <label>اللون</label>
                <div className="color-picker">
                  {COLORS.map((c) => (
                    <button key={c.key} type="button" title={c.label} aria-label={c.label}
                      className={"color-dot c-" + c.key + (color === c.key ? " selected" : "")}
                      onClick={() => setColor(c.key)} />
                  ))}
                </div>
              </div>
              <div className="field">
                <label>التاغات (اختياري)</label>
                <div className="tag-input-box">
                  {tags.map((t) => (
                    <span key={t} className="tag-chip small">#{t}
                      <button type="button" className="tag-remove" onClick={() => setTags((p) => p.filter((x) => x !== t))} aria-label="حذف التاغ">×</button>
                    </span>
                  ))}
                  <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={onTagKeyDown} onBlur={() => addTag(tagInput)} placeholder={tags.length ? "" : "اكتب تاغ واضغط Enter"} />
                </div>
              </div>
              <div className="field">
                <div className="toggle-row">
                  <span>📌 تثبيت في الأعلى</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal title="حذف الملاحظة" message="هل أنت متأكد من حذف هذه الملاحظة؟" onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
      )}
    </>
  );
}
