import Link from "next/link";
import { LayoutDashboard, Settings, CalendarDays } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 좌측 사이드바 */}
      <aside className="w-64 bg-[#4A628A] text-white flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-white/20 tracking-wider">
          SOZO ADMIN
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition"
          >
            <LayoutDashboard size={20} />
            <span>대시보드</span>
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition"
          >
            <Settings size={20} />
            <span>예약 설정 및 편집</span>
          </Link>
        </nav>
        <div className="p-4 text-sm text-center text-white/50 border-t border-white/20">
          © 2026 SOZO
        </div>
      </aside>

      {/* 우측 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
