import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOZO 예약",
  description:
    "SOZO 사역 예약 페이지입니다. 원하시는 날짜를 선택하여 예약을 진행해 주세요.",
  openGraph: {
    title: "SOZO 예약",
    description: "원하시는 날짜를 선택하여 예약을 진행해 주세요.",
    siteName: "SOZO 예약 시스템",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard: 페이지에 실제로 쓰인 글자만 내려받는 버전 (모바일에서 가벼움) */}
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
