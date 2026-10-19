"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface MenuItem {
  label: string;
  href: string;
  icon: string;
}

export interface MenuSection {
  title?: string;
  items: MenuItem[];
}

export const MENU: MenuSection[] = [
  {
    items: [
      { label: "대시보드", href: "/", icon: "📊" },
    ],
  },
  {
    title: "소비",
    items: [
      { label: "거래 내역", href: "/transactions", icon: "💳" },
      { label: "카드 관리", href: "/cards", icon: "🏧" },
      { label: "카테고리 분석", href: "/analytics", icon: "📈" },
    ],
  },
  {
    title: "재무",
    items: [
      { label: "수입", href: "/income", icon: "💰" },
      { label: "고정지출", href: "/fixed-expenses", icon: "🔄" },
      { label: "자산", href: "/assets", icon: "🏦" },
      { label: "대출", href: "/loans", icon: "📋" },
    ],
  },
  {
    title: "생활",
    items: [
      { label: "여행", href: "/trips", icon: "✈️" },
      { label: "가족 구성원", href: "/family", icon: "👨‍👩‍👧‍👦" },
    ],
  },
  {
    title: "데이터 관리",
    items: [
      { label: "빠른 입력", href: "/quick", icon: "⚡" },
      { label: "임포트", href: "/import", icon: "📁" },
      { label: "수동 입력", href: "/manual", icon: "✏️" },
      { label: "카테고리 규칙", href: "/category-rules", icon: "🏷️" },
    ],
  },
];

export const QUICK_ACTIONS: MenuItem[] = [
  { label: "빠른 입력", href: "/quick", icon: "⚡" },
  { label: "수동 입력", href: "/manual", icon: "✏️" },
  { label: "거래 내역", href: "/transactions", icon: "💳" },
  { label: "카드 관리", href: "/cards", icon: "🏧" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  // 폰: 화면 밖에서 펼쳐지는 w-64 서랍
  // md(768~1023): 아이콘만 있는 w-16 고정 레일 (라벨은 title 툴팁)
  // lg(≥1024): w-64 전체 사이드바
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-100 shadow-xl transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:w-16 md:shrink-0 md:translate-x-0 md:shadow-none lg:w-64 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700 flex items-center justify-between md:justify-center md:px-2 lg:justify-between lg:px-5">
        <Link href="/" className="text-lg font-bold text-white md:hidden lg:inline">
          unahouse.finance
        </Link>
        <Link href="/" className="hidden text-lg font-bold text-white md:inline lg:hidden" aria-label="unahouse.finance">
          u
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-100 md:hidden"
          aria-label="사이드바 닫기"
        >
          ✕
        </button>
      </div>

      {/* Menu */}
      <nav className="h-[calc(100%-5rem)] overflow-y-auto px-3 py-4 space-y-6 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1rem)] md:px-2 md:pb-4 md:space-y-3 lg:px-3 lg:space-y-6">
        {MENU.map((section, si) => (
          <div key={si}>
            {section.title && (
              <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider md:hidden lg:block">
                {section.title}
              </div>
            )}
            {si > 0 && <div className="mx-2 mb-3 hidden border-t border-slate-700 md:block lg:hidden" />}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      title={item.label}
                      aria-label={item.label}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition md:h-11 md:justify-center md:px-0 lg:h-auto lg:justify-start lg:px-3 ${
                        isActive
                          ? "bg-slate-700 text-white font-medium"
                          : "hover:bg-slate-700/50 hover:text-white"
                      }`}
                    >
                      <span className="text-base md:text-lg lg:text-base">{item.icon}</span>
                      <span className="md:hidden lg:inline">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-400 md:hidden lg:block">
        v0.1.0
      </div>
    </aside>
  );
}
