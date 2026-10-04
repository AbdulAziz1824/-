"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { HomeIcon, NoteIcon, TableIcon, CheckIcon, SettingsIcon, LogoutIcon, RefreshIcon, SunIcon, MoonIcon, LogoMark } from "@/components/Icons";
import { getGreeting } from "@/lib/greeting";
import { RefreshProvider, useRefresh } from "@/components/RefreshProvider";

const ITEMS = [
  { href: "/dashboard", label: "الرئيسية", icon: HomeIcon },
  { href: "/dashboard/notes", label: "ملاحظاتي", icon: NoteIcon },
  { href: "/dashboard/appointments", label: "مواعيدي", icon: TableIcon },
  { href: "/dashboard/tasks", label: "مهامي", icon: CheckIcon },
  { href: "/dashboard/settings", label: "الإعدادات", icon: SettingsIcon },
];
const REFRESH_EVERY_MS = 5 * 60 * 1000;

export default function DashboardLayout({ children }) {
  return (
    <RefreshProvider>
      <DashboardInner>{children}</DashboardInner>
    </RefreshProvider>
  );
}

function DashboardInner({ children }) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { triggerRefresh } = useRefresh();
  const [clock, setClock] = useState({ date: "--/--/----", time: "--:--:--" });
  const [greeting, setGreeting] = useState(getGreeting());
  const [theme, setTheme] = useState(null);
  const [lastUpdate, setLastUpdate] = useState("—");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);

  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      setClock({ date: now.toLocaleDateString("en-GB"), time: now.toLocaleTimeString("en-GB") });
      setGreeting(getGreeting(now));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("daftari_theme");
    setTheme(saved === "light" ? "light" : "dark");
  }, []);

  useEffect(() => {
    if (!theme) return;
    document.body.classList.toggle("light-theme", theme === "light");
    document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#ffffff" : "#0a1f16");
  }, [theme]);

  useEffect(() => {
    setLastUpdate(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, [pathname, refreshTick]);

  useEffect(() => {
    const t = setInterval(() => { triggerRefresh(); setRefreshTick((x) => x + 1); }, REFRESH_EVERY_MS);
    return () => clearInterval(t);
  }, [triggerRefresh]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("daftari_theme", next);
  }
  function manualRefresh() { triggerRefresh(); setRefreshTick((x) => x + 1); }

  if (loading || !user) return null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <LogoMark size={38} />
          <h2>دفتري</h2>
        </div>
        <nav>
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
                <Icon /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-danger btn-block" onClick={signOut}>تسجيل الخروج</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-right">
            <div className="live-clock">
              <span>{clock.date}</span>
              <span className="time">{clock.time}</span>
            </div>
            <span className="greeting">{greeting}، <b>{profile?.name || "—"}</b></span>
          </div>
          <div className="topbar-left">
            <div className="refresh-group" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="last-update">
                <span>آخر تحديث: <b>{lastUpdate}</b></span>
                <span style={{ fontSize: 10.5 }}>يتحدث تلقائيًا كل 5 دقائق</span>
              </div>
              <button className="refresh-btn" onClick={manualRefresh} title="تحديث"><RefreshIcon /></button>
            </div>
            <button className="theme-switch" onClick={toggleTheme} title="تبديل الوضع">
              <span className="switch-dot">{theme === "light" ? <SunIcon /> : <MoonIcon />}</span>
              <span className="switch-label">{theme === "light" ? "فاتح" : "داكن"}</span>
            </button>
            <button className="icon-btn logout-red" onClick={signOut} title="تسجيل الخروج"><LogoutIcon /></button>
          </div>
        </header>
        <div className="content">{children}</div>
      </div>

      <nav className="bottom-nav">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
              <Icon className="svg-icon sm" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
