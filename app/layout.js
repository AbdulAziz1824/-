import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { UIProvider } from "@/components/UIProvider";

export const metadata = {
  title: "دفتري",
  description: "ملاحظاتك ومواعيدك ومهامك في مكان واحد",
  applicationName: "دفتري",
  appleWebApp: { capable: true, title: "دفتري", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a1f16",
};

// تطبيق الوضع المحفوظ قبل رسم الصفحة لتجنب الوميض
const themeInit = `try{if(localStorage.getItem("daftari_theme")==="light"){document.body.classList.add("light-theme");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#ffffff");}}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <AuthProvider>
          <UIProvider>{children}</UIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
