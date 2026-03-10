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
      <div className="h-screen flex items-center justify-center text-[#4A628A] font-bold">
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
      <aside className="hidden md:flex w-64 bg-[#4A628A] text-white flex-col z-20 shadow-xl">
        <div className="p-6 text-2xl font-black border-b border-white/10 tracking-wider">
          SOZO ADMIN
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === "/admin" ? "bg-white text-[#4A628A] font-bold shadow-md" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
          >
            <LayoutDashboard size={20} />
            대시보드
          </Link>
          <Link
            href="/admin/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === "/admin/settings" ? "bg-white text-[#4A628A] font-bold shadow-md" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
          >
            <Settings size={20} />
            예약 설정 및 편집
          </Link>
        </nav>
        <button
          onClick={handleLogout}
          className="p-5 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors border-t border-white/10 flex items-center justify-center gap-2"
        >
          <LogOut size={16} /> 로그아웃
        </button>
      </aside>

      {/* ==========================================
          Mobile: 상단 헤더 (PC에서는 숨김)
      ========================================== */}
      <header className="md:hidden bg-[#4A628A] text-white p-4 flex justify-between items-center shadow-md z-20 sticky top-0">
        <div className="text-xl font-black tracking-wider">SOZO ADMIN</div>
        <button
          onClick={handleLogout}
          className="text-white/80 hover:text-white flex items-center gap-1.5 text-sm font-bold p-2 bg-white/10 rounded-lg active:scale-95 transition"
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
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${pathname === "/admin" ? "text-[#4A628A]" : "text-gray-400"}`}
        >
          <LayoutDashboard
            size={24}
            className={pathname === "/admin" ? "fill-blue-50" : ""}
          />
          <span
            className={`text-[11px] ${pathname === "/admin" ? "font-black" : "font-medium"}`}
          >
            대시보드
          </span>
        </Link>
        <Link
          href="/admin/settings"
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${pathname === "/admin/settings" ? "text-[#4A628A]" : "text-gray-400"}`}
        >
          <Settings
            size={24}
            className={pathname === "/admin/settings" ? "fill-blue-50" : ""}
          />
          <span
            className={`text-[11px] ${pathname === "/admin/settings" ? "font-black" : "font-medium"}`}
          >
            설정 및 편집
          </span>
        </Link>
      </nav>
    </div>
  );
}
