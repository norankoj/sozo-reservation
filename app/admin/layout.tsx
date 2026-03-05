"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Settings } from "lucide-react";

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

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-[#4A628A] text-white flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-white/20 tracking-wider">
          SOZO ADMIN
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 ${pathname === "/admin" ? "bg-white/20" : ""}`}
          >
            <LayoutDashboard size={20} />
            대시보드
          </Link>
          <Link
            href="/admin/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 ${pathname === "/admin/settings" ? "bg-white/20" : ""}`}
          >
            <Settings size={20} />
            예약 설정 및 편집
          </Link>
        </nav>
        <button
          onClick={() =>
            supabase.auth.signOut().then(() => router.push("/admin/login"))
          }
          className="p-4 text-sm text-white/70 hover:text-white border-t border-white/10"
        >
          로그아웃
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
