"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useUI } from "@/components/UIProvider";

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { showLoading, hideLoading, showToast } = useUI();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setName(profile?.name || ""); }, [profile]);

  async function saveName(e) {
    e.preventDefault();
    if (!name.trim()) return;
    showLoading();
    const { error: err } = await supabase.from("profiles").update({ name: name.trim() }).eq("id", user.id);
    hideLoading();
    if (err) { showToast("حدث خطأ أثناء الحفظ.", "error"); return; }
    showToast("تم تحديث الاسم.", "success");
    refreshProfile();
  }

  async function savePassword(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("كلمة المرور 8 أحرف على الأقل."); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين."); return; }
    showLoading();
    const { error: err } = await supabase.auth.updateUser({ password });
    hideLoading();
    if (err) { setError("تعذّر تغيير كلمة المرور."); return; }
    setPassword(""); setConfirm("");
    showToast("تم تغيير كلمة المرور.", "success");
  }

  return (
    <>
      <div className="section-header"><h3>⚙️ الإعدادات</h3></div>

      <div className="settings-card">
        <h4 style={{ marginTop: 0 }}>الحساب</h4>
        <form onSubmit={saveName}>
          <div className="field"><label>الاسم</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required /></div>
          <button type="submit" className="btn btn-primary btn-sm">حفظ الاسم</button>
        </form>
      </div>

      <div className="settings-card">
        <h4 style={{ marginTop: 0 }}>تغيير كلمة المرور</h4>
        <form onSubmit={savePassword}>
          <div className="field"><label>كلمة المرور الجديدة</label><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="field"><label>تأكيد كلمة المرور</label><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
          <div className="error-text">{error}</div>
          <button type="submit" className="btn btn-primary btn-sm">تغيير</button>
        </form>
      </div>

      <div className="settings-card">
        <button className="btn btn-danger btn-block" onClick={signOut}>تسجيل الخروج</button>
      </div>
    </>
  );
}
