"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Sidebar, { MENU, type MenuItem } from "@/components/Sidebar";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

// 화면 제목은 사이드바 메뉴 정의에서 만든다 (메뉴를 추가하면 제목도 자동으로 생김)
const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  MENU.flatMap((section) => section.items.map((item) => [item.href, item.label])),
);

const BOTTOM_NAV: MenuItem[] = [
  { label: "대시보드", href: "/", icon: "🏠" },
  { label: "거래", href: "/transactions", icon: "💳" },
  { label: "입력", href: "/quick", icon: "⚡" },
  { label: "카드", href: "/cards", icon: "🗂️" },
  { label: "분석", href: "/analytics", icon: "📈" },
];

function getTitle(pathname: string): string {
  // 가장 긴 메뉴 경로부터 맞춘다 (예: /transactions/123 → /transactions)
  const match = Object.keys(PAGE_TITLES)
    .filter((href) =>
      href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`),
    )
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : "unahouse.finance";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isUnlockPage = pathname === "/unlock";

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const title = useMemo(() => getTitle(pathname), [pathname]);

  if (isUnlockPage) {
    return <>{children}</>;
  }

  // 레이아웃 기준 (2026-10-19 결정)
  // - 폰 (< md 768px): 상단바 + 하단 메뉴 + 펼침 사이드바
  // - 태블릿/폰 가로 (md 768~1023px): 아이콘만 있는 좁은 사이드바 (고정)
  // - 데스크톱 (lg ≥ 1024px): 전체 사이드바
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:flex">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="min-h-screen flex-1 min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur md:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="h-14 px-4 flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700"
              onClick={() => setIsSidebarOpen((value) => !value)}
              aria-label="사이드바 토글"
            >
              {isSidebarOpen ? "✕" : "☰"}
            </button>
            <h1 className="min-w-0 truncate text-sm font-semibold text-slate-800">{title}</h1>
            <Link
              href="/quick"
              className="ml-auto inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full bg-blue-600 px-3 text-sm font-semibold text-white"
            >
              빠른입력
            </Link>
          </div>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)] overflow-auto bg-gradient-to-b from-slate-50 to-slate-100 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1rem)] md:min-h-screen md:pb-0">
          <PwaInstallPrompt />
          <div>{children}</div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 pt-2 shadow-[0_-6px_20px_-12px_rgba(0,0,0,0.5)] backdrop-blur md:hidden" style={{ height: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="grid grid-cols-5 gap-2">
            {BOTTOM_NAV.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex flex-col items-center justify-center whitespace-nowrap rounded-lg px-1 py-1.5 text-xs leading-4 transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg leading-5">{item.icon}</span>
                  <span className="mt-0.5 font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-slate-900/50 md:hidden"
          role="presentation"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
