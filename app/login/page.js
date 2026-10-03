"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUI } from "@/components/UIProvider";
import { LogoMark } from "@/components/Icons";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useUI();

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/auth/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: identifier.trim() }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setSubmitting(false);
      setError(res && res.status !== 404 ? "تعذّر الاتصال، حاول مرة أخرى." : "اسم المستخدم أو كلمة المرور غير صحيحة.");
      return;
    }
    const { email } = await res.json();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) { setError("اسم المستخدم أو كلمة المرور غير صحيحة."); return; }
    showToast("تم تسجيل الدخول بنجاح.", "success");
    router.replace("/dashboard");
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <LogoMark size={64} />
          <h1>دفتري</h1>
          <p>ملاحظاتك ومواعيدك ومهامك في مكان واحد</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>اسم المستخدم</label>
            <input type="text" dir="ltr" autoCapitalize="none" autoCorrect="off" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </div>
          <div className="field">
            <label>كلمة المرور</label>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="error-text">{error}</div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
        <div className="switch-line">ليس لديك حساب؟ <Link href="/signup">إنشاء حساب جديد</Link></div>
      </div>
    </div>
  );
}
