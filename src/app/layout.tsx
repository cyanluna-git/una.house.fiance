import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
