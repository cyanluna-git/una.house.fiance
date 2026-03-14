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
      { label: "임포트", href: "/import", icon: "📁" },
      { label: "수동 입력", href: "/manual", icon: "✏️" },
      { label: "카테고리 규칙", href: "/category-rules", icon: "🏷️" },
    ],
  },
];

export const QUICK_ACTIONS: MenuItem[] = [
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

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 w-64 bg-slate-900 text-slate-100 shadow-xl transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:shadow-none ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-white">
          unahouse.finance
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-100 lg:hidden"
          aria-label="사이드바 닫기"
        >
          ✕
        </button>
      </div>

      {/* Menu */}
      <nav className="h-[calc(100%-5rem)] overflow-y-auto px-3 py-4 space-y-6">
        {MENU.map((section, si) => (
          <div key={si}>
            {section.title && (
              <div className="px-3 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                        isActive
                          ? "bg-slate-700 text-white font-medium"
                          : "hover:bg-slate-700/50 hover:text-white"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-400">
        v0.1.0
      </div>
    </aside>
  );
}
