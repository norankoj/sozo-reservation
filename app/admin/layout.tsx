"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Settings, LogOut } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 로그인 페이지가 아닌데 세션이 없으면 로그인으로 이동
      if (!session && pathname !== "/admin/login") {
        router.push("/admin/login");
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, [router, pathname]);

  if (loading && pathname !== "/admin/login")
    return (
      <div className="h-screen flex items-center justify-center text-brand font-bold">
        인증 확인 중...
      </div>
    );
  if (pathname === "/admin/login") return <>{children}</>;

  const handleLogout = () => {
    supabase.auth.signOut().then(() => router.push("/admin/login"));
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 text-gray-900">
      {/* ==========================================
          PC: 좌측 사이드바 (모바일에서는 숨김)
      ========================================== */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col z-20">
        <div className="px-6 py-5 text-xl font-bold text-gray-900">
          <span className="text-brand">SOZO</span> 관리자
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${pathname === "/admin" ? "bg-brand text-white font-semibold shadow-sm shadow-brand/30" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <LayoutDashboard size={20} />
            대시보드
          </Link>
          <Link
            href="/admin/settings"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${pathname === "/admin/settings" ? "bg-brand text-white font-semibold shadow-sm shadow-brand/30" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <Settings size={20} />
            예약 설정 및 편집
          </Link>
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition flex items-center gap-2"
        >
          <LogOut size={16} /> 로그아웃
        </button>
      </aside>

      {/* ==========================================
          Mobile: 상단 헤더 (PC에서는 숨김)
      ========================================== */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center z-20 sticky top-0">
        <div className="text-lg font-bold text-gray-900">
          <span className="text-brand">SOZO</span> 관리자
        </div>
        <button
          onClick={handleLogout}
          aria-label="로그아웃"
          className="text-gray-500 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg active:scale-95 transition"
        >
          <LogOut size={16} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 w-full">
        {children}
      </main>

      {/* ==========================================
          Mobile: 하단 탭 네비게이션 (PC에서는 숨김)
      ========================================== */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20 pb-safe">
        <Link
          href="/admin"
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${pathname === "/admin" ? "text-brand" : "text-gray-400"}`}
        >
          <LayoutDashboard
            size={24}
            className={pathname === "/admin" ? "fill-brand/10" : ""}
          />
          <span
            className={`text-[11px] ${pathname === "/admin" ? "font-bold" : "font-medium"}`}
          >
            대시보드
          </span>
        </Link>
        <Link
          href="/admin/settings"
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${pathname === "/admin/settings" ? "text-brand" : "text-gray-400"}`}
        >
          <Settings
            size={24}
            className={pathname === "/admin/settings" ? "fill-brand/10" : ""}
          />
          <span
            className={`text-[11px] ${pathname === "/admin/settings" ? "font-bold" : "font-medium"}`}
          >
            설정 및 편집
          </span>
        </Link>
      </nav>
    </div>
  );
}
