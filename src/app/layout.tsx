import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "unahouse.finance - 개인 자산관리",
  description: "카드 명세서와 거래내역을 통합 관리하는 개인 자산관리 웹서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 bg-gradient-to-b from-slate-50 to-slate-100 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
