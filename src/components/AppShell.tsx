"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Sidebar, { type MenuItem } from "@/components/Sidebar";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

const PAGE_TITLES: Record<string, string> = {
  "/": "대시보드",
  "/cards": "카드 관리",
  "/transactions": "거래 내역",
  "/analytics": "카테고리 분석",
  "/income": "수입",
  "/fixed-expenses": "고정지출",
  "/assets": "자산",
  "/loans": "대출",
  "/trips": "여행",
  "/family": "가족 구성원",
  "/import": "명세서 임포트",
  "/manual": "수동 거래 입력",
  "/category-rules": "카테고리 규칙",
};

const BOTTOM_NAV: MenuItem[] = [
  { label: "대시보드", href: "/", icon: "🏠" },
  { label: "거래", href: "/transactions", icon: "💳" },
  { label: "입력", href: "/manual", icon: "✏️" },
  { label: "카드", href: "/cards", icon: "🗂️" },
  { label: "분석", href: "/analytics", icon: "📈" },
];

function getTitle(pathname: string): string {
  if (Object.prototype.hasOwnProperty.call(PAGE_TITLES, pathname)) {
    return PAGE_TITLES[pathname];
  }
  if (pathname.startsWith("/manual")) return PAGE_TITLES["/manual"];
  if (pathname.startsWith("/transactions")) return PAGE_TITLES["/transactions"];
  if (pathname.startsWith("/analytics")) return PAGE_TITLES["/analytics"];
  if (pathname.startsWith("/cards")) return PAGE_TITLES["/cards"];
  if (pathname.startsWith("/import")) return PAGE_TITLES["/import"];
  if (pathname.startsWith("/family")) return PAGE_TITLES["/family"];
  if (pathname.startsWith("/trips")) return PAGE_TITLES["/trips"];
  if (pathname.startsWith("/income")) return PAGE_TITLES["/income"];
  if (pathname.startsWith("/fixed-expenses")) return PAGE_TITLES["/fixed-expenses"];
  if (pathname.startsWith("/assets")) return PAGE_TITLES["/assets"];
  if (pathname.startsWith("/loans")) return PAGE_TITLES["/loans"];
  if (pathname.startsWith("/category-rules")) return PAGE_TITLES["/category-rules"];
  return "unahouse.finance";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const title = useMemo(() => getTitle(pathname), [pathname]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="min-h-screen flex-1 min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur md:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="h-14 px-4 flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700"
              onClick={() => setIsSidebarOpen((value) => !value)}
              aria-label="사이드바 토글"
            >
              {isSidebarOpen ? "✕" : "☰"}
            </button>
            <h1 className="text-sm font-semibold text-slate-800">{title}</h1>
            <Link
              href="/manual"
              className="ml-auto inline-flex h-10 items-center rounded-full bg-blue-600 px-3 text-sm font-semibold text-white"
            >
              빠른입력
            </Link>
          </div>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)] overflow-auto bg-gradient-to-b from-slate-50 to-slate-100 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:min-h-screen lg:pb-0">
          <PwaInstallPrompt />
          <div className="lg:px-0">{children}</div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-6px_20px_-12px_rgba(0,0,0,0.5)] backdrop-blur md:hidden" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
          <div className="grid grid-cols-5 gap-2">
            {BOTTOM_NAV.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex flex-col items-center justify-center rounded-lg px-2 py-2 text-[10px] leading-3 transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg leading-4">{item.icon}</span>
                  <span className="mt-1 font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-slate-900/50 lg:hidden"
          role="presentation"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
