import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata = {
  title: "FittnaClass | منصة الثانوية العامة والأزهرية",
  description:
    "FittnaClass منصة تعليمية تساعد طلاب الثانوية العامة والأزهرية على بدء التعلم بسرعة داخل تجربة واضحة ومتوازنة.",
  keywords: "FittnaClass, تعليم, ثانوية عامة, أزهري, دورات, تعلم أونلاين",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800;900&family=Lexend:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Noto Sans Arabic', 'Lexend', sans-serif" }}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
