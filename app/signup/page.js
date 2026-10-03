"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUI } from "@/components/UIProvider";
import { LogoMark } from "@/components/Icons";
import { normalizeUsername, isValidUsername } from "@/lib/username";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useUI();

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين."); return; }
    if (password.length < 8) { setError("يجب أن تكون كلمة المرور 8 أحرف على الأقل."); return; }
    const uname = normalizeUsername(username);
    if (!isValidUsername(uname)) { setError("اسم المستخدم من 3 إلى 20 حرفًا (حروف وأرقام و _ . -) بدون مسافات."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username: uname, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "حدث خطأ أثناء إنشاء الحساب."); return; }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: json.email, password });
      if (signInError) {
        showToast("تم إنشاء الحساب! سجّل الدخول الآن.", "success");
        router.replace("/login");
        return;
      }
      showToast("تم إنشاء الحساب بنجاح.", "success");
      router.replace("/dashboard");
    } catch {
      setError("تعذّر الاتصال، حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <LogoMark size={64} />
          <h1>إنشاء حساب</h1>
          <p>ابدأ بتنظيم ملاحظاتك ومواعيدك ومهامك</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field"><label>الاسم</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required /></div>
          <div className="field">
            <label>اسم المستخدم</label>
            <input type="text" dir="ltr" autoCapitalize="none" autoCorrect="off" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <div className="field-hint">من 3 إلى 20 حرفًا، بدون مسافات.</div>
          </div>
          <div className="field"><label>كلمة المرور</label><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <div className="field"><label>تأكيد كلمة المرور</label><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
          <div className="error-text">{error}</div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "جاري الإنشاء..." : "إنشاء الحساب"}
          </button>
        </form>
        <div className="switch-line">لديك حساب؟ <Link href="/login">تسجيل الدخول</Link></div>
      </div>
    </div>
  );
}
