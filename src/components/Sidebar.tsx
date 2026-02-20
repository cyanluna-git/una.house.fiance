"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface MenuItem {
  label: string;
  href: string;
  icon: string;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

const MENU: MenuSection[] = [
  {
    items: [
      { label: "대시보드", href: "/", icon: "📊" },
    ],
  },
  {
    title: "소비",
    items: [
      { label: "거래 내역", href: "/transactions", icon: "💳" },
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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-slate-800 text-slate-300 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <Link href="/" className="text-lg font-bold text-white">
          unahouse.finance
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {MENU.map((section, si) => (
          <div key={si}>
            {section.title && (
              <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
      <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-500">
        v0.1.0
      </div>
    </aside>
  );
}
