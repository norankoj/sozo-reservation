import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
